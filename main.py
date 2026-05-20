"""
FastAPI application — Paragon Part Matching
Run: uvicorn main:app --reload
"""
import os
from contextlib import asynccontextmanager
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

load_dotenv()

# ── Shared state ──────────────────────────────────────────────────────────────

_openai_client: Optional[OpenAI] = None
_customer_profiles: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _openai_client, _customer_profiles

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set. Copy .env.example → .env and add your key.")

    _openai_client = OpenAI(api_key=api_key)

    # Load (or build) catalog cache
    try:
        catalog, embeddings = preprocess.load()
    except FileNotFoundError:
        print("[startup] Cache not found — running preprocessing now…")
        catalog, embeddings = preprocess.run()

    retrieval.init(catalog, embeddings)

    _customer_profiles = personalization.load_profiles()
    print(f"[startup] Loaded {len(_customer_profiles)} customer profiles.", flush=True)

    yield


app = FastAPI(title="Paragon Part Matching", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve built frontend if it exists
_frontend_dist = Path(__file__).parent / "frontend" / "dist"
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query:       str
    customer_id: Optional[str] = None


class SearchResponse(BaseModel):
    results:       list[dict]
    query_debug:   dict
    referential:   bool = False


class CustomerOut(BaseModel):
    customer_id:   str
    customer_name: str
    total_orders:  int


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/customers", response_model=list[CustomerOut])
def get_customers():
    return [
        CustomerOut(
            customer_id   = p.customer_id,
            customer_name = p.customer_name,
            total_orders  = p.total_orders,
        )
        for p in _customer_profiles.values()
    ]


@app.post("/api/search", response_model=SearchResponse)
def search(req: SearchRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    profile = _customer_profiles.get(req.customer_id) if req.customer_id else None

    # ── Referential query shortcut ────────────────────────────────────────────
    if is_referential(req.query) and profile:
        prior_orders = personalization.resolve_referential(req.query, profile)
        if prior_orders:
            results = _orders_to_results(prior_orders, profile)
            return SearchResponse(
                results     = results,
                query_debug = {"note": "resolved from order history", "query": req.query},
                referential = True,
            )

    # ── Parse query ──────────────────────────────────────────────────────────
    query_parsed: ParsedAttributes = parse(req.query, expand_abbrevs=True)

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
            results     = [],
            query_debug = _debug(query_parsed),
            referential = False,
        )

    # ── Structured scoring ────────────────────────────────────────────────────
    scored = scorer.score_all(query_parsed, candidates)

    # ── Personalization ───────────────────────────────────────────────────────
    for s in scored:
        pers = personalization.personalize(query_parsed, s.candidate.parsed, profile)
        s.confidence = min(1.0, round(s.confidence + pers.boost, 4))
        # Attach fills to candidate for formatting
        s.candidate._pers_fills = pers.fills  # type: ignore[attr-defined]

    # Re-sort after personalization boost
    scored.sort(key=lambda s: s.confidence, reverse=True)

    # ── Conditional LLM reranking ─────────────────────────────────────────────
    history_ctx = _history_context(profile) if profile else None

    if reranker.should_rerank(scored, query_parsed.specificity):
        results = reranker.rerank(
            query       = req.query,
            scored      = scored,
            client      = _openai_client,
            history_ctx = history_ctx,
        )
        # Inject personalization fills from scorer pass
        _inject_fills(results, scored)
    else:
        results = [reranker._format(s) for s in scored[:3]]
        _inject_fills(results, scored)

    return SearchResponse(
        results     = results,
        query_debug = _debug(query_parsed),
        referential = False,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

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
    top_families = list(profile.family_affinity.keys())[:3]
    top_materials = list(profile.material_affinity.keys())[:2]
    recent = [o["catalog_description"] for o in profile.recent_orders[:3]]
    return (
        f"Customer prefers: families={top_families}, materials={top_materials}. "
        f"Recent orders: {recent}"
    )


def _orders_to_results(orders: list[dict], profile) -> list[dict]:
    """Convert raw order history entries to result format for referential queries."""
    seen = set()
    results = []
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


def _inject_fills(results: list[dict], scored: list["scorer.ScoredCandidate"]) -> None:
    """Copy personalization fills from scored candidates into result dicts."""
    scored_map = {s.candidate.catalog_id: s for s in scored}
    for r in results:
        cid = r.get("catalog_id", "")
        s = scored_map.get(cid)
        if s:
            fills = getattr(s.candidate, "_pers_fills", [])
            r["personalization_fills"] = fills
