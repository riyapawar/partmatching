"""
Conditional LLM reranking via gpt-4o-mini.

Triggered only when:
  1. The confidence gap between #1 and #2 candidates is < GAP_THRESHOLD, OR
  2. Query specificity is very low (< SPEC_THRESHOLD) — purely semantic query

When triggered, sends top RERANK_K candidates to the LLM for a final pass.
Returns reordered results with calibrated confidence and one-sentence reasons.

Hallucination guard: the LLM may only reference catalog_ids from the input set.
"""
import json
import re
from typing import Optional

from openai import OpenAI

from backend.scorer import ScoredCandidate

GAP_THRESHOLD  = 0.10   # confidence gap below which LLM reranking fires
SPEC_THRESHOLD = 0.17   # specificity below which LLM reranking fires
RERANK_K       = 4      # how many candidates to send to LLM

SYSTEM_PROMPT = """You are an industrial fastener expert matching customer queries to catalog items.

Given a customer query and candidate catalog matches, return a reranked list of the top 3.

Output ONLY valid JSON matching this schema:
{
  "results": [
    {
      "catalog_id": "CAT-XXXX",
      "confidence": 0.XX,
      "reason": "one sentence"
    }
  ]
}

Rules:
- Only use catalog_ids from the provided candidates — never invent new ones.
- Order from best to worst match.
- Return at most 3 results.
- Be precise with confidence: if 73% certain output 0.73, not 0.70 or 0.75.
- confidence ≥ 0.85 = near-perfect; 0.65–0.85 = strong; 0.45–0.65 = probable; < 0.45 = speculative.
- The reason must explain WHY this item matches (not just restate the description).
- STRICT: if structural constraints are provided (e.g. "required family: hex bolt"), items that do NOT match that family must rank below items that do. Never rank a non-matching family item above a matching one."""


def should_rerank(scored: list[ScoredCandidate], query_specificity: float) -> bool:
    if query_specificity < SPEC_THRESHOLD:
        return True
    if len(scored) >= 2:
        gap = scored[0].confidence - scored[1].confidence
        if gap < GAP_THRESHOLD:
            return True
    return False


def rerank(
    query:       str,
    scored:      list[ScoredCandidate],
    client:      OpenAI,
    history_ctx: Optional[str] = None,
) -> list[dict]:
    """
    Call gpt-4o-mini to rerank top-RERANK_K candidates.
    Returns list of dicts: {catalog_id, sku, description, confidence, reason,
                             breakdown, retrieval_tags, personalization_fills}
    Falls back to original scoring if LLM call fails or returns bad output.
    """
    top_k = scored[:RERANK_K]
    allowed_ids = {s.candidate.catalog_id for s in top_k}

    candidates_text = "\n".join(
        f"{i+1}. [{s.candidate.catalog_id}] {s.candidate.description}"
        for i, s in enumerate(top_k)
    )

    user_content = f"Query: {query}\n\nCandidates:\n{candidates_text}"
    if history_ctx:
        user_content += f"\n\nCustomer context: {history_ctx}"

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=512,
        )
        raw = resp.choices[0].message.content or ""
        data = json.loads(raw)
        results = data.get("results", [])
    except Exception as e:
        print(f"[reranker] LLM call failed ({e}), falling back to structured scoring.")
        return _fallback(scored)

    # ── Validate + filter hallucinated catalog_ids ────────────────────────────
    valid: list[dict] = []
    seen_ids: set[str] = set()
    for item in results:
        cid = item.get("catalog_id", "")
        if cid not in allowed_ids or cid in seen_ids:
            continue
        seen_ids.add(cid)

        # Find the original scored candidate to carry breakdown + tags
        original = next((s for s in top_k if s.candidate.catalog_id == cid), None)
        if original is None:
            continue

        conf = float(item.get("confidence", original.confidence))
        conf = max(0.0, min(1.0, conf))

        valid.append(_format(original, confidence=conf, reason=item.get("reason", "")))

    if not valid:
        return _fallback(scored)

    # Pad to 3 from remaining top_k candidates if LLM returned fewer
    if len(valid) < 3:
        used_ids = {v["catalog_id"] for v in valid}
        for s in top_k:
            if len(valid) >= 3:
                break
            if s.candidate.catalog_id not in used_ids:
                valid.append(_format(s))
                used_ids.add(s.candidate.catalog_id)

    return valid[:3]


def _fallback(scored: list[ScoredCandidate]) -> list[dict]:
    return [_format(s) for s in scored[:3]]


def _format(
    s: ScoredCandidate,
    confidence: Optional[float] = None,
    reason: str = "",
) -> dict:
    from backend.scorer import confidence_label
    conf = confidence if confidence is not None else s.confidence
    return {
        "catalog_id":           s.candidate.catalog_id,
        "sku":                  s.candidate.sku,
        "description":          s.candidate.description,
        "confidence":           conf,
        "confidence_label":     confidence_label(conf),
        "reason":               reason,
        "breakdown":            [
            {
                "attribute": bd.attribute,
                "status":    bd.status,
                "value":     bd.value,
                "points":    bd.points,
            }
            for bd in s.breakdown
        ],
        "retrieval_tags":       s.candidate.retrieval_tags,
        "personalization_fills": [],   # populated by main.py
        "semantic_sim":         round(s.candidate.semantic_sim, 4),
    }
