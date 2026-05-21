"""
Hybrid retrieval: BM25 + cosine similarity fused with Reciprocal Rank Fusion.
Returns top-N candidate catalog items for a query.

Also exposes a three-tier part-number lookup (exact → normalized → fuzzy) that
callers can run before the main pipeline for instant SKU-based returns.
"""
import difflib
import re
from dataclasses import dataclass
from typing import Optional

import numpy as np
from rank_bm25 import BM25Okapi

from backend.abbreviations import expand
from backend.attribute_parser import ParsedAttributes


# ── State (populated at startup) ──────────────────────────────────────────────

_catalog: list[dict] = []
_embeddings: np.ndarray = np.empty((0,))
_bm25: Optional[BM25Okapi] = None
_embed_cache: dict[str, np.ndarray] = {}   # query text → normalised vector

# Part-number lookup indexes
_sku_index:      dict[str, dict] = {}        # SKU.upper()    → item
_catid_index:    dict[str, dict] = {}        # CATALOG_ID.upper() → item
_sku_norm_index: dict[str, dict] = {}        # _norm_sku(sku) → item (first wins)
_sku_norm_pairs: list[tuple[str, dict]] = [] # [(norm_sku, item)] for fuzzy scan

_SKU_NORM_RE  = re.compile(r'[^a-z0-9]')
SKU_FUZZY_THRESHOLD = 0.82                   # SequenceMatcher ratio floor


def _norm_sku(s: str) -> str:
    """Strip non-alphanumeric characters and lowercase — used for all SKU comparisons."""
    return _SKU_NORM_RE.sub('', s.lower())


def init(catalog: list[dict], embeddings: np.ndarray) -> None:
    """Call once at startup with precomputed catalog + embeddings."""
    global _catalog, _embeddings, _bm25
    global _sku_index, _catid_index, _sku_norm_index, _sku_norm_pairs
    _catalog    = catalog
    _embeddings = embeddings
    corpus      = [_tokenize(item["search_text"]) for item in catalog]
    _bm25       = BM25Okapi(corpus)

    # Build part-number lookup indexes
    _sku_index.clear()
    _catid_index.clear()
    _sku_norm_index.clear()
    _sku_norm_pairs.clear()
    for item in catalog:
        sku   = item["sku"]
        catid = item["catalog_id"]
        _sku_index[sku.upper()] = item
        _catid_index[catid.upper()] = item
        norm = _norm_sku(sku)
        if norm not in _sku_norm_index:
            _sku_norm_index[norm] = item
        _sku_norm_pairs.append((norm, item))

    print(f"[retrieval] BM25 index built over {len(catalog)} items.", flush=True)


# ── Part-number lookup ────────────────────────────────────────────────────────

def sku_lookup(query: str) -> list[dict]:
    """
    Three-tier part-number lookup that short-circuits the main pipeline.

    Tier 1 — exact:      case-insensitive match on raw SKU or catalog ID.
    Tier 2 — normalized: strip all non-alphanumeric chars, then match.
    Tier 3 — fuzzy:      SequenceMatcher ratio ≥ SKU_FUZZY_THRESHOLD on normalized forms;
                         returns up to 3 hits ordered by descending similarity.

    Each hit: {"item": catalog_dict, "tier": str, "score": float}
    Returns [] when no tier finds a match → caller should run the normal pipeline.
    """
    q = query.strip()
    if not q:
        return []

    # Tier 1: exact (case-insensitive), covers both SKU and catalog ID
    q_upper = q.upper()
    if q_upper in _sku_index:
        return [{"item": _sku_index[q_upper], "tier": "exact", "score": 1.0}]
    if q_upper in _catid_index:
        return [{"item": _catid_index[q_upper], "tier": "exact", "score": 1.0}]

    # Tier 2: normalized (drop spaces, dashes, dots, etc.)
    q_norm = _norm_sku(q)
    if q_norm and q_norm in _sku_norm_index:
        return [{"item": _sku_norm_index[q_norm], "tier": "normalized", "score": 0.97}]

    # Tier 3: fuzzy — scan all normalized SKUs
    if not q_norm:
        return []
    hits: list[dict] = []
    for norm, item in _sku_norm_pairs:
        ratio = difflib.SequenceMatcher(None, q_norm, norm).ratio()
        if ratio >= SKU_FUZZY_THRESHOLD:
            hits.append({"item": item, "tier": "fuzzy", "score": round(ratio, 3)})
    hits.sort(key=lambda h: h["score"], reverse=True)
    return hits[:3]


# ── Public search API ─────────────────────────────────────────────────────────

@dataclass
class Candidate:
    catalog_id:      str
    sku:             str
    description:     str
    parsed:          dict       # raw parsed dict from enriched catalog
    semantic_sim:    float      # cosine similarity (0–1)
    bm25_score:      float
    rrf_score:       float
    retrieval_tags:  list[str]  # which stage(s) surfaced this item


def search(
    query: str,
    query_parsed: ParsedAttributes,
    query_vec: np.ndarray,
    top_n: int = 20,
    rrf_k: int = 60,
) -> list[Candidate]:
    """
    Hybrid BM25 + cosine retrieval with Reciprocal Rank Fusion.
    Returns up to top_n candidates, hard-filtered for metric/imperial compatibility.
    """
    assert _bm25 is not None, "Call retrieval.init() first"

    expanded = expand(query)
    tokens   = _tokenize(expanded)

    # ── BM25 ─────────────────────────────────────────────────────────────────
    bm25_scores = _bm25.get_scores(tokens)
    bm25_ranked = list(np.argsort(bm25_scores)[::-1])   # descending

    # ── Cosine similarity ─────────────────────────────────────────────────────
    # query_vec is already L2-normalised; embeddings are too → dot = cosine
    cos_scores  = _embeddings @ query_vec                # shape (N,)
    cos_ranked  = list(np.argsort(cos_scores)[::-1])

    # ── RRF fusion ───────────────────────────────────────────────────────────
    rrf: dict[int, float] = {}
    tags: dict[int, list[str]] = {}

    for rank, idx in enumerate(bm25_ranked):
        rrf[idx] = rrf.get(idx, 0.0) + 1.0 / (rrf_k + rank + 1)
        tags.setdefault(idx, []).append("bm25")

    for rank, idx in enumerate(cos_ranked):
        rrf[idx] = rrf.get(idx, 0.0) + 1.0 / (rrf_k + rank + 1)
        tags.setdefault(idx, []).append("embedding")

    ranked_indices = sorted(rrf.keys(), key=lambda i: rrf[i], reverse=True)

    # ── Build candidates with hard metric/imperial filter ─────────────────────
    candidates: list[Candidate] = []
    for idx in ranked_indices:
        item = _catalog[idx]
        if not _system_compatible(query_parsed.system, item["parsed"].get("system")):
            continue
        candidates.append(
            Candidate(
                catalog_id     = item["catalog_id"],
                sku            = item["sku"],
                description    = item["description"],
                parsed         = item["parsed"],
                semantic_sim   = float(cos_scores[idx]),
                bm25_score     = float(bm25_scores[idx]),
                rrf_score      = rrf[idx],
                retrieval_tags = tags.get(idx, []),
            )
        )
        if len(candidates) >= top_n:
            break

    return candidates


def embed_query(query: str, client) -> np.ndarray:
    """Embed a single query string and L2-normalise. Results are cached in-process."""
    key = expand(query).lower().strip()
    if key in _embed_cache:
        return _embed_cache[key]
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=[key],
    )
    vec = np.array(resp.data[0].embedding, dtype=np.float32)
    norm = np.linalg.norm(vec)
    result = vec / norm if norm > 0 else vec
    if len(_embed_cache) < 2048:   # cap memory: ~6MB at 1536-dim float32
        _embed_cache[key] = result
    return result


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    return re.findall(r'[a-z0-9]+', text.lower())


def _system_compatible(query_sys: Optional[str], item_sys: Optional[str]) -> bool:
    """
    Hard-filter: metric query never matches imperial item and vice-versa.
    If either side is unknown, allow the match.
    """
    if query_sys is None or item_sys is None:
        return True
    return query_sys == item_sys
