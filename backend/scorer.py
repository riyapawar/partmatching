"""
Structured attribute scoring with explicit domain-correct penalties.

Scoring rubric (max 100 raw points when all attributes match exactly):
  Family          35 pts  (exact) | 20 pts (compatible) | -30 pts (mismatch)
  Diameter+Thread 25 pts  (exact) | 12 pts (diameter only) | -20 pts (mismatch)
  Length          20 pts  (exact) | 10 pts (within 10%)    | -15 pts (mismatch)
  Material         8 pts  (exact) |  4 pts (compatible grade or category)
  Finish           7 pts  (exact) |  3 pts (compatible zinc sub-type)
  Standard         5 pts  (exact)
  Neg-constraint  -22 pts per violation

Final confidence blends structured score with semantic similarity,
weighted by query specificity.
"""
from dataclasses import dataclass, field
from typing import Optional

from backend.attribute_parser import ParsedAttributes
from backend.abbreviations import (
    FAMILY_COMPAT, MATERIAL_COMPAT, STAINLESS_GRADE_COMPAT, FINISH_COMPAT
)
from backend.retrieval import Candidate


@dataclass
class ScoreBreakdown:
    attribute:  str
    status:     str   # 'exact'|'compatible'|'mismatch'|'missing'|'not_in_catalog'|'violated'
    value:      str
    points:     int


@dataclass
class ScoredCandidate:
    candidate:   Candidate
    confidence:  float               # 0–1
    breakdown:   list[ScoreBreakdown] = field(default_factory=list)
    raw_points:  int = 0
    max_points:  int = 0


# ── Main scorer ───────────────────────────────────────────────────────────────

def score_all(
    query: ParsedAttributes,
    candidates: list[Candidate],
) -> list[ScoredCandidate]:
    scored = [_score_one(query, c) for c in candidates]
    scored.sort(key=lambda s: s.confidence, reverse=True)
    return scored


def _score_one(query: ParsedAttributes, candidate: Candidate) -> ScoredCandidate:
    cp = candidate.parsed   # dict from enriched catalog
    breakdown: list[ScoreBreakdown] = []
    points = 0
    max_pts = 0

    # ── Family ───────────────────────────────────────────────────────────────
    if query.family:
        max_pts += 35
        cf = cp.get("family")
        if cf == query.family:
            points += 35
            bd = ScoreBreakdown("family", "exact", query.family, 35)
        elif cf and cf in FAMILY_COMPAT.get(query.family, set()):
            points += 20
            bd = ScoreBreakdown("family", "compatible", f"{cf} (≈{query.family})", 20)
        elif cf:
            points -= 30
            bd = ScoreBreakdown("family", "mismatch", cf, -30)
        else:
            bd = ScoreBreakdown("family", "not_in_catalog", "", 0)
        breakdown.append(bd)

    # ── Diameter + thread pitch ───────────────────────────────────────────────
    if query.diameter_in is not None:
        max_pts += 25
        cd = cp.get("diameter_in")
        if cd and cd > 0:
            ratio = query.diameter_in / cd
            if 0.98 <= ratio <= 1.02:           # exact diameter
                cp_pitch = cp.get("thread_pitch")
                if query.thread_pitch and cp_pitch and cp_pitch > 0:
                    pr = query.thread_pitch / cp_pitch
                    if 0.98 <= pr <= 1.02:
                        points += 25
                        bd = ScoreBreakdown("thread", "exact",
                                            f"{candidate.parsed.get('diameter_raw')} exact pitch", 25)
                    else:
                        points += 12
                        bd = ScoreBreakdown("thread", "compatible",
                                            f"diameter match, pitch differs "
                                            f"({query.thread_pitch} vs {cp_pitch})", 12)
                else:
                    points += 25
                    bd = ScoreBreakdown("thread", "exact",
                                        cp.get("diameter_raw", ""), 25)
            else:
                points -= 20
                bd = ScoreBreakdown("thread", "mismatch",
                                    f"query {query.diameter_raw} vs catalog {cp.get('diameter_raw')}", -20)
        else:
            bd = ScoreBreakdown("thread", "not_in_catalog", "", 0)
        breakdown.append(bd)

    # ── Length ────────────────────────────────────────────────────────────────
    if query.length_in is not None:
        max_pts += 20
        cl = cp.get("length_in")
        if cl and cl > 0:
            ratio = query.length_in / cl
            if 0.98 <= ratio <= 1.02:
                points += 20
                bd = ScoreBreakdown("length", "exact",
                                    f"{cp.get('length_raw', '')}", 20)
            elif 0.88 <= ratio <= 1.12:
                points += 10
                bd = ScoreBreakdown("length", "compatible",
                                    f"close ({query.length_raw} ≈ {cp.get('length_raw')})", 10)
            else:
                points -= 15
                bd = ScoreBreakdown("length", "mismatch",
                                    f"query {query.length_raw} vs catalog {cp.get('length_raw')}", -15)
        else:
            bd = ScoreBreakdown("length", "not_in_catalog", "", 0)
        breakdown.append(bd)

    # ── Material ──────────────────────────────────────────────────────────────
    if query.material:
        max_pts += 8
        cm = cp.get("material")
        cg = cp.get("material_grade")
        if cm == query.material:
            if query.material_grade and cg:
                if query.material_grade == cg:
                    points += 8
                    bd = ScoreBreakdown("material", "exact", f"{cm} {cg}", 8)
                elif cg in STAINLESS_GRADE_COMPAT.get(query.material_grade, set()):
                    points += 6
                    bd = ScoreBreakdown("material", "compatible",
                                        f"{cm} {cg} (≈{query.material_grade})", 6)
                else:
                    points += 4
                    bd = ScoreBreakdown("material", "compatible",
                                        f"same category ({cm}), different grade", 4)
            else:
                points += 8
                bd = ScoreBreakdown("material", "exact", cm, 8)
        elif cm and cm in MATERIAL_COMPAT.get(query.material, set()):
            points += 4
            bd = ScoreBreakdown("material", "compatible", f"{cm} (≈{query.material})", 4)
        elif cm:
            bd = ScoreBreakdown("material", "mismatch", cm, 0)
        else:
            bd = ScoreBreakdown("material", "not_in_catalog", "", 0)
        breakdown.append(bd)

    # ── Finish ────────────────────────────────────────────────────────────────
    if query.finish:
        max_pts += 7
        cf = cp.get("finish")
        if cf == query.finish:
            points += 7
            bd = ScoreBreakdown("finish", "exact", cf, 7)
        elif cf and cf in FINISH_COMPAT.get(query.finish, set()):
            points += 3
            bd = ScoreBreakdown("finish", "compatible",
                                f"{cf} (≈{query.finish})", 3)
        elif cf:
            bd = ScoreBreakdown("finish", "mismatch", cf, 0)
        else:
            bd = ScoreBreakdown("finish", "not_in_catalog", "", 0)
        breakdown.append(bd)

    # ── Standard ─────────────────────────────────────────────────────────────
    if query.standard:
        max_pts += 5
        cs = cp.get("standard")
        if cs == query.standard:
            points += 5
            breakdown.append(ScoreBreakdown("standard", "exact", cs, 5))
        else:
            breakdown.append(ScoreBreakdown("standard", "missing", cs or "", 0))

    # ── Negative constraints ──────────────────────────────────────────────────
    desc_lower = candidate.description.lower()
    mat_str    = (cp.get("material") or "")
    fin_str    = (cp.get("finish") or "")
    for constraint in query.negative_constraints:
        c = constraint.lower()
        if c in desc_lower or c in mat_str or c in fin_str:
            points -= 22
            breakdown.append(
                ScoreBreakdown("negative_constraint", "violated",
                               f"NOT {constraint}", -22)
            )

    # ── Confidence ────────────────────────────────────────────────────────────
    confidence = _compute_confidence(
        points      = points,
        max_pts     = max_pts,
        semantic    = candidate.semantic_sim,
        specificity = query.specificity,
    )

    return ScoredCandidate(
        candidate  = candidate,
        confidence = confidence,
        breakdown  = breakdown,
        raw_points = points,
        max_points = max_pts,
    )


def _compute_confidence(
    points: int,
    max_pts: int,
    semantic: float,
    specificity: float,
) -> float:
    """
    Blend structured score with semantic similarity.
    - When the query is specific (high specificity), structured score dominates.
    - Max achievable confidence is capped by specificity to prevent false certainty
      on vague queries.
    """
    if max_pts > 0:
        structured = max(0.0, points) / max_pts   # 0–1 for the attributes present
    else:
        structured = 0.0

    # Weight: 0.4 (no attrs) → 0.80 (fully specified)
    s_weight = 0.40 + 0.40 * specificity
    e_weight = 1.0 - s_weight

    blended = s_weight * structured + e_weight * semantic

    # Cap: vague queries (specificity=0) cap at 0.58; fully specified cap at 0.95
    cap = 0.58 + 0.37 * specificity
    return round(min(blended, cap), 4)


def confidence_label(confidence: float) -> str:
    if confidence >= 0.70:
        return "strong"
    if confidence >= 0.45:
        return "likely"
    if confidence >= 0.25:
        return "possible"
    return "weak"
