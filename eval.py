"""
Evaluation script — runs all 34 example queries against the live pipeline
and prints a formatted results table.

Usage:
    python eval.py                    # all queries, no customer
    python eval.py --customer CUST-001
    python eval.py --query "M8 flat washer"
"""
import argparse
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# ── Bootstrap ──────────────────────────────────────────────────────────────────

import numpy as np
from openai import OpenAI

import backend.preprocess      as preprocess
import backend.retrieval       as retrieval
import backend.scorer          as scorer
import backend.personalization as personalization
import backend.reranker        as reranker
from backend.attribute_parser  import parse, is_referential
from backend.personalization   import detect_conflicts

client   = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
catalog, embeddings = preprocess.load()
retrieval.init(catalog, embeddings)
profiles = personalization.load_profiles()

# ── Example queries ────────────────────────────────────────────────────────────

QUERIES = [
    "M8 flat washer",
    "5/16 hex nut",
    "1/2 inch hex nut",
    "M6 hex nuts",
    "SHCS 7/16 x 2-1/2",
    "1/2 rod 6 foot",
    "HHB 3/4-10 x 5/8",
    "lock washer 5/8",
    "M8 x 16 hex cap screw",
    "M16 threaded rod 60mm",
    "5/8 flat washer",
    "M12 x 50mm button socket",
    "#8-32 lock washer",
    "1/4-20 x 3/4 hex cap screw zinc",
    "M4 x 16mm socket head cap screw",
    "3/8 lag screw 1 inch",
    "M5 x 30 threaded rod",
    "7/16-14 phillips pan machine screw 1-1/4",
    "5/16-18 flat washer",
    "M10 x 60mm lag screw",
    "M8 x 50mm BHCS",
    "3/4-10 tap bolt 5/8",
    "M12 hex nut",
    "1/2-13 x 3 lag screw",
    "M6 x 50mm tap bolt",
    "#10-24 x 1/2 threaded rod",
    "5/8-11 x 3/8 lag screw",
    "M16 x 8mm pan head machine screw",
    "3/8-16 x 4 hex bolt",
    "M4 hex nut",
    "M8 x 50mm button socket cap screw alloy black oxide",
    "brass hex nut 1/2-13",
    "the same washers as last time",
]

CONF_COLOR = {
    "strong":   "\033[92m",  # green
    "likely":   "\033[94m",  # blue
    "possible": "\033[93m",  # yellow
    "weak":     "\033[91m",  # red
}
RESET = "\033[0m"
BOLD  = "\033[1m"


def run_query(query: str, customer_id: str | None) -> dict:
    t0      = time.perf_counter()
    profile = profiles.get(customer_id) if customer_id else None

    if is_referential(query) and profile:
        orders = personalization.resolve_referential(query, profile)
        if orders:
            return {
                "query":      query,
                "referential": True,
                "conflicts":  [],
                "results":    [{"description": o["catalog_description"],
                                "sku": o["sku"],
                                "confidence": 0.95,
                                "confidence_label": "strong"} for o in orders[:3]],
                "ms":         round((time.perf_counter() - t0) * 1000, 1),
            }

    qp        = parse(query)
    conflicts = detect_conflicts(qp, profile)
    qvec      = retrieval.embed_query(query, client)
    cands     = retrieval.search(query, qp, qvec, top_n=20)

    if not cands:
        return {"query": query, "referential": False, "conflicts": conflicts,
                "results": [], "ms": round((time.perf_counter() - t0) * 1000, 1)}

    scored = scorer.score_all(qp, cands)

    for s in scored:
        pers = personalization.personalize(qp, s.candidate.parsed, profile)
        s.confidence = min(1.0, round(s.confidence + pers.boost, 4))

    scored.sort(key=lambda s: s.confidence, reverse=True)

    if reranker.should_rerank(scored, qp.specificity):
        hist = _history_ctx(profile)
        results = reranker.rerank(query, scored, client, hist)
    else:
        results = [reranker._format(s) for s in scored[:3]]

    return {
        "query":      query,
        "referential": False,
        "conflicts":  conflicts,
        "results":    results,
        "ms":         round((time.perf_counter() - t0) * 1000, 1),
        "parsed": {
            "system": qp.system, "family": qp.family,
            "diameter": qp.diameter_raw, "length": qp.length_raw,
            "specificity": round(qp.specificity, 2),
        },
    }


def _history_ctx(profile) -> str | None:
    if not profile or profile.sparse:
        return None
    return f"Prefers: {list(profile.material_affinity.keys())[:2]}"


def print_result(r: dict) -> None:
    q = r["query"]
    print(f"\n{BOLD}Query: {q}{RESET}")

    if "parsed" in r:
        p = r["parsed"]
        attrs = [f"{k}={v}" for k, v in p.items() if v]
        print(f"  Parse: {', '.join(attrs)}")

    if r.get("conflicts"):
        for c in r["conflicts"]:
            print(f"  \033[93m[CONFLICT] {c}{RESET}")

    if r.get("referential"):
        print("  [Referential query - resolved from history]")

    if not r["results"]:
        print("  \033[91mNo matches found\033[0m")
        return

    for i, res in enumerate(r["results"], 1):
        conf  = res.get("confidence", 0)
        label = res.get("confidence_label", "weak")
        color = CONF_COLOR.get(label, "")
        desc  = res.get("description", "")[:65]
        sku   = res.get("sku", "")
        pct   = round(conf * 100)
        print(f"  {i}. {color}{pct:>3}% [{label:8}]{RESET}  {desc}")
        print(f"          SKU: {sku}")
        if res.get("reason"):
            print(f"          {res['reason']}")

    print(f"  [{r['ms']}ms]")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--customer", default=None, help="Customer ID e.g. CUST-001")
    parser.add_argument("--query",    default=None, help="Run a single query")
    args = parser.parse_args()

    queries = [args.query] if args.query else QUERIES

    print(f"\n{'='*70}")
    print(f"  PartMatch — Eval ({len(queries)} queries)")
    if args.customer:
        p = profiles.get(args.customer)
        name = p.customer_name if p else "unknown"
        print(f"  Customer: {args.customer} ({name})")
    print(f"{'='*70}")

    total_ms   = 0.0
    conf_sum   = 0.0
    n_strong   = 0

    for q in queries:
        r = run_query(q, args.customer)
        print_result(r)
        total_ms += r["ms"]
        if r["results"]:
            top_conf = r["results"][0].get("confidence", 0)
            conf_sum += top_conf
            if r["results"][0].get("confidence_label") == "strong":
                n_strong += 1

    print(f"\n{'='*70}")
    print(f"  Avg latency : {total_ms/len(queries):.0f}ms")
    print(f"  Avg top conf: {conf_sum/len(queries):.2f}")
    print(f"  Strong matches: {n_strong}/{len(queries)} ({100*n_strong//len(queries)}%)")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
