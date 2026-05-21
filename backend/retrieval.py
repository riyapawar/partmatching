"""
Hybrid retrieval: BM25 + cosine similarity fused with Reciprocal Rank Fusion.
Returns top-N candidate catalog items for a query.
"""
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


def init(catalog: list[dict], embeddings: np.ndarray) -> None:
    """Call once at startup with precomputed catalog + embeddings."""
    global _catalog, _embeddings, _bm25
    _catalog    = catalog
    _embeddings = embeddings
    corpus      = [_tokenize(item["search_text"]) for item in catalog]
    _bm25       = BM25Okapi(corpus)
    print(f"[retrieval] BM25 index built over {len(catalog)} items.", flush=True)


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
