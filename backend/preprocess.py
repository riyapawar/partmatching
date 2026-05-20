"""
Offline preprocessing: parse, enrich, and embed all active catalog items.
Run once:  python -m backend.preprocess
Output:    cache/enriched_catalog.json  (parsed attributes + search text)
           cache/embeddings.npz         (L2-normalised float32 vectors, indexed by position)
"""
import csv
import json
import os
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent.parent / ".env")

from backend.attribute_parser import parse, build_search_text

DATA_DIR  = Path(__file__).parent.parent / "data"
CACHE_DIR = Path(__file__).parent.parent / "cache"

EMBED_MODEL = "text-embedding-3-small"
BATCH_SIZE  = 500   # OpenAI allows up to 2048; 500 keeps payloads small


# ── Public API ────────────────────────────────────────────────────────────────

def run(force: bool = False) -> tuple[list[dict], np.ndarray]:
    """
    Build enriched catalog + embeddings.  Returns (catalog_list, embeddings_array).
    Reads from cache if already built and force=False.
    """
    enriched_path  = CACHE_DIR / "enriched_catalog.json"
    embeddings_path = CACHE_DIR / "embeddings.npz"

    if not force and enriched_path.exists() and embeddings_path.exists():
        return _load_cache(enriched_path, embeddings_path)

    CACHE_DIR.mkdir(exist_ok=True)

    catalog = _load_catalog()
    enriched = _enrich(catalog)
    embeddings = _embed([e["search_text"] for e in enriched])

    with open(enriched_path, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False)

    np.savez_compressed(str(embeddings_path), embeddings=embeddings)

    print(f"[preprocess] Cached {len(enriched)} items -> {enriched_path}", flush=True)
    return enriched, embeddings


def load() -> tuple[list[dict], np.ndarray]:
    """Load from cache (raises if not built yet)."""
    enriched_path  = CACHE_DIR / "enriched_catalog.json"
    embeddings_path = CACHE_DIR / "embeddings.npz"
    if not enriched_path.exists() or not embeddings_path.exists():
        raise FileNotFoundError(
            "Cache not found. Run: python -m backend.preprocess"
        )
    return _load_cache(enriched_path, embeddings_path)


# ── Internals ─────────────────────────────────────────────────────────────────

def _load_catalog() -> list[dict]:
    path = DATA_DIR / "catalog.csv"
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    active = [r for r in rows if r.get("active", "").strip().upper() == "Y"]
    print(f"[preprocess] {len(active)} active items (of {len(rows)} total)", flush=True)
    return active


def _enrich(catalog: list[dict]) -> list[dict]:
    enriched = []
    for item in catalog:
        desc = item["catalog_description"]
        parsed = parse(desc, expand_abbrevs=True)
        search_text = build_search_text(desc, parsed)
        enriched.append({
            "catalog_id":  item["catalog_id"],
            "sku":         item["sku"],
            "description": desc,
            "parsed": {
                "system":         parsed.system,
                "family":         parsed.family,
                "diameter_raw":   parsed.diameter_raw,
                "diameter_in":    parsed.diameter_in,
                "thread_pitch":   parsed.thread_pitch,
                "length_raw":     parsed.length_raw,
                "length_in":      parsed.length_in,
                "material":       parsed.material,
                "material_grade": parsed.material_grade,
                "finish":         parsed.finish,
                "standard":       parsed.standard,
                "specificity":    parsed.specificity,
            },
            "search_text": search_text,
        })
    return enriched


def _embed(texts: list[str]) -> np.ndarray:
    client = OpenAI()
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        print(f"[preprocess] Embedding batch {i//BATCH_SIZE + 1} ({len(batch)} items)…", flush=True)
        resp = client.embeddings.create(model=EMBED_MODEL, input=batch)
        all_vectors.extend([r.embedding for r in resp.data])

    arr = np.array(all_vectors, dtype=np.float32)
    # L2-normalise so dot product == cosine similarity
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    return arr / norms


def _load_cache(enriched_path: Path, embeddings_path: Path) -> tuple[list[dict], np.ndarray]:
    with open(enriched_path, encoding="utf-8") as f:
        enriched = json.load(f)
    data = np.load(str(embeddings_path))
    embeddings = data["embeddings"]
    print(f"[preprocess] Loaded {len(enriched)} items from cache.", flush=True)
    return enriched, embeddings


# ── CLI entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    force = "--force" in sys.argv
    run(force=force)
