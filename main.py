"""
FastAPI application — Paragon Part Matching
Run: uvicorn main:app --reload
"""
import csv
import json
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from pydantic import BaseModel

import backend.preprocess      as preprocess
import backend.retrieval       as retrieval
import backend.scorer          as scorer
import backend.personalization as personalization
import backend.reranker        as reranker
from backend.attribute_parser  import parse, is_referential, ParsedAttributes
from backend.personalization   import detect_conflicts
from backend.abbreviations     import FAMILY_COMPAT, MATERIAL_COMPAT

load_dotenv()

CACHE_DIR      = Path(__file__).parent / "cache"
DATA_DIR       = Path(__file__).parent / "data"
REVIEW_QUEUE   = CACHE_DIR / "review_queue.json"
LOW_CONF_THRESHOLD = 0.40   # searches below this are auto-logged for review

# ── Shared state ──────────────────────────────────────────────────────────────

_openai_client: Optional[OpenAI] = None
_customer_profiles: dict = {}
_demand_signals: dict = {}          # sku → {orders, customers, last_date, heat}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _openai_client, _customer_profiles, _demand_signals

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set. Copy .env.example -> .env and add your key.")

    _openai_client = OpenAI(api_key=api_key)

    try:
        catalog, embeddings = preprocess.load()
    except FileNotFoundError:
        print("[startup] Cache not found — running preprocessing now...")
        catalog, embeddings = preprocess.run()

    retrieval.init(catalog, embeddings)

    _customer_profiles = personalization.load_profiles()
    print(f"[startup] Loaded {len(_customer_profiles)} customer profiles.", flush=True)

    _demand_signals = _compute_demand_signals(DATA_DIR / "order_history.csv")
    print(f"[startup] Demand signals computed for {len(_demand_signals)} SKUs.", flush=True)

    CACHE_DIR.mkdir(exist_ok=True)
    yield


app = FastAPI(title="Paragon Part Matching", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query:       str
    customer_id: Optional[str] = None


class SearchResponse(BaseModel):
    results:        list[dict]
    query_debug:    dict
    referential:    bool = False
    conflicts:      list[str] = []
    search_time_ms: float = 0.0


class CustomerOut(BaseModel):
    customer_id:       str
    customer_name:     str
    total_orders:      int
    metric_ratio:      float
    material_affinity: dict
    finish_affinity:   dict
    family_affinity:   dict
    sparse:            bool


class ReviewRequest(BaseModel):
    query:       str
    customer_id: Optional[str]
    results:     list[dict]
    reason:      str = "manual"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/customers", response_model=list[CustomerOut])
def get_customers():
    return [
        CustomerOut(
            customer_id       = p.customer_id,
            customer_name     = p.customer_name,
            total_orders      = p.total_orders,
            metric_ratio      = round(p.metric_ratio, 3),
            material_affinity = {k: round(v, 3) for k, v in p.material_affinity.items()},
            finish_affinity   = {k: round(v, 3) for k, v in p.finish_affinity.items()},
            family_affinity   = {k: round(v, 3) for k, v in
                                  list(p.family_affinity.items())[:5]},
            sparse            = p.sparse,
        )
        for p in _customer_profiles.values()
    ]


@app.post("/api/search", response_model=SearchResponse)
def search(req: SearchRequest):
    t0 = time.perf_counter()

    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    profile = _customer_profiles.get(req.customer_id) if req.customer_id else None

    # ── Referential query shortcut ────────────────────────────────────────────
    if is_referential(req.query):
        if not profile:
            # Referential query with no customer selected — tell the frontend
            return SearchResponse(
                results        = [],
                query_debug    = {"note": "select a customer to resolve order history"},
                referential    = True,
                conflicts      = [],
                search_time_ms = _ms(t0),
            )
        prior_orders = personalization.resolve_referential(req.query, profile)
        if prior_orders:
            results = _orders_to_results(prior_orders)
            return SearchResponse(
                results        = results,
                query_debug    = {"note": "resolved from order history", "query": req.query},
                referential    = True,
                conflicts      = [],
                search_time_ms = _ms(t0),
            )

    # ── Parse query ───────────────────────────────────────────────────────────
    query_parsed: ParsedAttributes = parse(req.query, expand_abbrevs=True)

    # ── Conflict detection (before retrieval — shown regardless of results) ───
    conflicts = detect_conflicts(query_parsed, profile)

    # Bail early if no fastener attributes were recognized at all.
    # Before giving up, try LLM extraction as a fallback for non-standard phrasing.
    if query_parsed.specificity == 0.0:
        llm_parsed = _llm_parse(req.query, _openai_client)
        if llm_parsed and llm_parsed.specificity > 0.0:
            query_parsed = llm_parsed
        else:
            return SearchResponse(
                results        = [],
                query_debug    = _debug(query_parsed),
                conflicts      = conflicts,
                search_time_ms = _ms(t0),
            )

    # ── Embed query ───────────────────────────────────────────────────────────
    query_vec = retrieval.embed_query(req.query, _openai_client)

    # ── Hybrid retrieval (top 20) ─────────────────────────────────────────────
    candidates = retrieval.search(
        query        = req.query,
        query_parsed = query_parsed,
        query_vec    = query_vec,
        top_n        = 20,
    )

    if not candidates:
        return SearchResponse(
            results        = [],
            query_debug    = _debug(query_parsed),
            conflicts      = conflicts,
            search_time_ms = _ms(t0),
        )

    # ── Structured scoring ────────────────────────────────────────────────────
    scored = scorer.score_all(query_parsed, candidates)

    # ── Personalization ───────────────────────────────────────────────────────
    for s in scored:
        pers = personalization.personalize(
            query_parsed, s.candidate.parsed, profile,
            candidate_sku=s.candidate.sku,
        )
        s.confidence = min(1.0, round(s.confidence + pers.boost, 4))
        s.candidate._pers_fills = pers.fills  # type: ignore[attr-defined]

    scored.sort(key=lambda s: s.confidence, reverse=True)

    # ── Conditional LLM reranking ─────────────────────────────────────────────
    history_ctx = _history_context(profile) if profile else None

    # Surface parsed constraints to the reranker so it can't override known family/material
    parse_hints: list[str] = []
    if query_parsed.family:
        parse_hints.append(f"required family: {query_parsed.family.replace('_', ' ')}")
    if query_parsed.material:
        parse_hints.append(f"required material: {query_parsed.material}")
    if query_parsed.system:
        parse_hints.append(f"required system: {query_parsed.system}")
    if parse_hints:
        hints_str  = "Structural constraints: " + "; ".join(parse_hints) + "."
        history_ctx = f"{history_ctx}\n{hints_str}" if history_ctx else hints_str

    if reranker.should_rerank(scored, query_parsed.specificity):
        results = reranker.rerank(
            query       = req.query,
            scored      = scored,
            client      = _openai_client,
            history_ctx = history_ctx,
        )
        _inject_fills(results, scored)
    else:
        results = [reranker._format(s) for s in scored[:3]]
        _inject_fills(results, scored)

    # Always pad to 3 — reranker may return fewer if LLM omits candidates
    if len(results) < 3:
        used_skus = {r.get("sku") for r in results}
        for s in scored:
            if len(results) >= 3:
                break
            if s.candidate.sku not in used_skus:
                results.append(reranker._format(s))
                used_skus.add(s.candidate.sku)
        _inject_fills(results, scored)

    # Deduplicate by SKU (catalog may contain near-duplicate entries)
    seen_skus: set[str] = set()
    deduped: list[dict] = []
    for r in results:
        sku = r.get("sku", "")
        if sku not in seen_skus:
            seen_skus.add(sku)
            deduped.append(r)
    results = deduped[:3]

    ms = _ms(t0)

    # ── Auto-log low-confidence searches for review ───────────────────────────
    if results and results[0].get("confidence", 1.0) < LOW_CONF_THRESHOLD:
        _log_review(req.query, req.customer_id, results, reason="low_confidence")

    return SearchResponse(
        results        = results,
        query_debug    = _debug(query_parsed),
        referential    = False,
        conflicts      = conflicts,
        search_time_ms = ms,
    )


@app.get("/api/catalog")
def get_catalog():
    """Return all active catalog items with parsed attributes for the Catalog Explorer."""
    return [
        {
            "sku":      item["sku"],
            "desc":     item["description"],
            "family":   item["parsed"].get("family"),
            "material": item["parsed"].get("material"),
            "finish":   item["parsed"].get("finish"),
            "system":   item["parsed"].get("system"),
            "diameter": item["parsed"].get("diameter_raw"),
            "length":   item["parsed"].get("length_raw"),
        }
        for item in retrieval._catalog
    ]


@app.get("/api/catalog/demand")
def get_demand():
    """Return demand signals per SKU: order count, customer count, recency heat."""
    return _demand_signals


@app.get("/api/catalog/{sku}/substitutes")
def get_substitutes(sku: str):
    """Return ranked compatible alternative SKUs for a given part."""
    target = next((item for item in retrieval._catalog if item["sku"] == sku), None)
    if not target:
        raise HTTPException(status_code=404, detail="SKU not found")

    tp             = target["parsed"]
    target_family  = tp.get("family")
    target_material= tp.get("material")
    target_diam_in = tp.get("diameter_in")
    target_len_in  = tp.get("length_in")

    results = []
    for item in retrieval._catalog:
        if item["sku"] == sku:
            continue
        cp    = item["parsed"]
        score = 0
        reasons: list[str] = []

        cf = cp.get("family")
        if cf == target_family:
            score += 4
            reasons.append("same family")
        elif cf and target_family and cf in FAMILY_COMPAT.get(target_family, set()):
            score += 2
            reasons.append("compatible family")
        else:
            continue   # different family entirely — not a substitute

        cd = cp.get("diameter_in")
        if target_diam_in and cd:
            r = target_diam_in / cd
            if 0.98 <= r <= 1.02:
                score += 3; reasons.append("exact diameter")
            elif 0.85 <= r <= 1.15:
                score += 1; reasons.append("close diameter")

        cl = cp.get("length_in")
        if target_len_in and cl:
            r = target_len_in / cl
            if 0.98 <= r <= 1.02:
                score += 2; reasons.append("exact length")
            elif 0.85 <= r <= 1.15:
                score += 1; reasons.append("close length")

        cm = cp.get("material")
        if cm == target_material:
            score += 2; reasons.append("same material")
        elif cm and target_material and cm in MATERIAL_COMPAT.get(target_material, set()):
            score += 1; reasons.append("compatible material")

        if score >= 2:
            results.append({
                "sku":         item["sku"],
                "description": item["description"],
                "score":       score,
                "reasons":     reasons,
                "family":      cf,
                "material":    cm,
                "diameter":    cp.get("diameter_raw"),
                "length":      cp.get("length_raw"),
                "finish":      cp.get("finish"),
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:6]


@app.post("/api/review")
def submit_review(req: ReviewRequest):
    """Manually flag a search result for human review."""
    _log_review(req.query, req.customer_id, req.results, reason=req.reason)
    return {"status": "logged"}


@app.get("/api/review")
def get_review_queue():
    """Return all items in the review queue."""
    if not REVIEW_QUEUE.exists():
        return []
    with open(REVIEW_QUEUE, encoding="utf-8") as f:
        return json.load(f)


# ── Helpers ───────────────────────────────────────────────────────────────────

_LLM_FAMILIES = [
    "socket_head_cap_screw", "button_socket_cap_screw", "hex_cap_screw",
    "hex_bolt", "heavy_hex_bolt", "tap_bolt", "lag_screw", "machine_screw",
    "pan_head_machine_screw", "phillips_pan_machine_screw",
    "hex_nut", "flat_washer", "lock_washer", "threaded_rod", "cap_screw",
]

_LLM_PARSE_PROMPT = f"""You are a fastener specification parser. Extract structured attributes from the query.
Return ONLY valid JSON — no explanation, no markdown.

Allowed values:
  system:   "metric" | "imperial" | null
  family:   one of {_LLM_FAMILIES} | null
  diameter_raw: e.g. "M8", "3/8", "#8", "1/4" | null
  thread_pitch: number — TPI for imperial, mm pitch for metric | null
  length_raw: e.g. "30mm", "1-1/2", "6ft", "2" | null
  material: "steel" | "stainless" | "alloy" | "brass" | "bronze" | null
  finish:   "zinc" | "yellow_zinc" | "hdg" | "black_oxide" | "plain" | "mech_zinc" | null

Semantic mappings to apply:
  "corrosion resistant" | "rust proof" | "marine" → material: "stainless"
  "outdoor" | "exterior" | "weatherproof" | "galvanized" → finish: "hdg"
  "high strength" | "grade 8" | "strongest" → material: "alloy"
  "decorative" | "black" → finish: "black_oxide"
  "allen" | "hex socket" | "hex key" → family: "socket_head_cap_screw"
  "phillips" | "pan head" → family: "phillips_pan_machine_screw"

Return exactly this shape:
{{"system":null,"family":null,"diameter_raw":null,"thread_pitch":null,"length_raw":null,"material":null,"finish":null}}"""


def _llm_parse(query: str, client: OpenAI) -> Optional[ParsedAttributes]:
    """GPT-4o-mini fallback parser for queries the regex couldn't parse."""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _LLM_PARSE_PROMPT},
                {"role": "user",   "content": f'Query: "{query}"'},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=150,
        )
        data = json.loads(resp.choices[0].message.content or "{}")
    except Exception as e:
        print(f"[llm_parse] Failed: {e}")
        return None

    p = ParsedAttributes()
    p.system       = data.get("system")
    p.family       = data.get("family") if data.get("family") in _LLM_FAMILIES else None
    p.diameter_raw = data.get("diameter_raw")
    p.thread_pitch = float(data["thread_pitch"]) if data.get("thread_pitch") is not None else None
    p.length_raw   = data.get("length_raw")
    p.material     = data.get("material") if data.get("material") in {"steel","stainless","alloy","brass","bronze"} else None
    p.finish       = data.get("finish")   if data.get("finish")   in {"zinc","yellow_zinc","hdg","black_oxide","plain","mech_zinc"} else None

    # Convert diameter_raw to diameter_in
    raw_d = p.diameter_raw or ""
    if raw_d.upper().startswith("M"):
        try:    p.diameter_in = float(raw_d[1:]) / 25.4
        except: pass
    elif raw_d:
        import re as _re
        m = _re.match(r'^(\d+)/(\d+)$', raw_d)
        if m: p.diameter_in = int(m.group(1)) / int(m.group(2))

    # Convert length_raw to length_in
    p.length_in = _parse_length_in(p.length_raw or "")

    key_attrs = ["family", "diameter_in", "thread_pitch", "length_in", "material", "finish"]
    p.specificity = sum(1 for a in key_attrs if getattr(p, a) is not None) / len(key_attrs)

    print(f"[llm_parse] query='{query}' specificity={p.specificity:.2f} family={p.family}", flush=True)
    return p


def _parse_length_in(raw: str) -> Optional[float]:
    """Convert a length_raw string to inches. Best-effort for LLM-parsed values."""
    import re as _re
    raw = raw.strip()
    if not raw:
        return None
    m = _re.match(r'^(\d+(?:\.\d+)?)mm$', raw, _re.I)
    if m: return float(m.group(1)) / 25.4
    m = _re.match(r'^(\d+(?:\.\d+)?)ft?$', raw, _re.I)
    if m: return float(m.group(1)) * 12.0
    m = _re.match(r'^(\d+)-(\d+)/(\d+)$', raw)
    if m: return int(m.group(1)) + int(m.group(2)) / int(m.group(3))
    m = _re.match(r'^(\d+)/(\d+)$', raw)
    if m: return int(m.group(1)) / int(m.group(2))
    m = _re.match(r'^(\d+(?:\.\d+)?)"?$', raw)
    if m: return float(m.group(1))
    return None


def _compute_demand_signals(order_file: Path) -> dict:
    """Read order_history.csv and compute per-SKU demand heat signals."""
    now         = datetime.now()
    cutoff_hot  = (now - timedelta(days=90)).strftime("%Y-%m-%d")
    cutoff_warm = (now - timedelta(days=180)).strftime("%Y-%m-%d")

    by_sku: dict[str, dict] = {}
    with open(order_file, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            sku  = row["sku"]
            date = row["order_date"].strip()
            cid  = row["customer_id"]
            if sku not in by_sku:
                by_sku[sku] = {"orders": 0, "customers": set(), "last_date": ""}
            by_sku[sku]["orders"] += 1
            by_sku[sku]["customers"].add(cid)
            if date > by_sku[sku]["last_date"]:
                by_sku[sku]["last_date"] = date

    result: dict = {}
    for sku, d in by_sku.items():
        last = d["last_date"]
        heat = "hot" if last >= cutoff_hot else ("warm" if last >= cutoff_warm else "cold")
        result[sku] = {
            "orders":    d["orders"],
            "customers": len(d["customers"]),
            "last_date": last,
            "heat":      heat,
        }
    return result


def _ms(t0: float) -> float:
    return round((time.perf_counter() - t0) * 1000, 1)


def _debug(parsed: ParsedAttributes) -> dict:
    return {
        "system":       parsed.system,
        "family":       parsed.family,
        "diameter":     parsed.diameter_raw,
        "thread_pitch": parsed.thread_pitch,
        "length":       parsed.length_raw,
        "material":     parsed.material,
        "finish":       parsed.finish,
        "specificity":  round(parsed.specificity, 2),
        "negatives":    parsed.negative_constraints,
    }


def _history_context(profile) -> Optional[str]:
    if not profile or profile.sparse:
        return None
    top_families  = list(profile.family_affinity.keys())[:3]
    top_materials = list(profile.material_affinity.keys())[:2]
    recent        = [o["catalog_description"] for o in profile.recent_orders[:3]]
    return (
        f"Customer prefers: families={top_families}, materials={top_materials}. "
        f"Recent orders: {recent}"
    )


def _orders_to_results(orders: list[dict]) -> list[dict]:
    seen, results = set(), []
    for o in orders:
        sku = o["sku"]
        if sku in seen:
            continue
        seen.add(sku)
        results.append({
            "catalog_id":            "",
            "sku":                   sku,
            "description":           o["catalog_description"],
            "confidence":            0.95,
            "confidence_label":      "strong",
            "reason":                f"Exact match from your order history ({o['order_date']})",
            "breakdown":             [],
            "retrieval_tags":        ["history"],
            "personalization_fills": ["resolved from your order history"],
            "semantic_sim":          1.0,
        })
    return results[:3]


def _inject_fills(results: list[dict], scored: list) -> None:
    scored_map = {s.candidate.catalog_id: s for s in scored}
    for r in results:
        cid = r.get("catalog_id", "")
        s   = scored_map.get(cid)
        if s:
            fills = getattr(s.candidate, "_pers_fills", [])
            r["personalization_fills"] = fills


def _log_review(query: str, customer_id: Optional[str],
                results: list[dict], reason: str) -> None:
    entry = {
        "timestamp":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "query":       query,
        "customer_id": customer_id,
        "reason":      reason,
        "top_result":  results[0] if results else None,
    }
    queue: list = []
    if REVIEW_QUEUE.exists():
        try:
            with open(REVIEW_QUEUE, encoding="utf-8") as f:
                queue = json.load(f)
        except Exception:
            queue = []
    queue.append(entry)
    with open(REVIEW_QUEUE, "w", encoding="utf-8") as f:
        json.dump(queue, f, indent=2, ensure_ascii=False)


# ── Static frontend (must be mounted AFTER API routes so /api/* isn't caught) ─
_frontend_dist = Path(__file__).parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
