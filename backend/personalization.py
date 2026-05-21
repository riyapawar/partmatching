"""
Customer profiling and personalization.

Builds per-customer affinity profiles from order history.
At query time, boosts candidates for attributes the customer prefers —
but ONLY for attributes the user did NOT explicitly specify in the query.
"""
import csv
import math
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from backend.attribute_parser import parse, ParsedAttributes

DATA_DIR = Path(__file__).parent.parent / "data"

_REFERENCE_DATE = datetime.now()
_HALF_LIFE_DAYS = 180.0    # exponential recency decay half-life


# ── Dataclasses ───────────────────────────────────────────────────────────────

@dataclass
class CustomerProfile:
    customer_id:    str
    customer_name:  str
    total_orders:   int
    sparse:         bool          # True if < 3 orders
    metric_ratio:   float         # 0–1, fraction of metric orders
    family_affinity:   dict[str, float] = field(default_factory=dict)
    material_affinity: dict[str, float] = field(default_factory=dict)
    finish_affinity:   dict[str, float] = field(default_factory=dict)
    recent_skus:       list[str] = field(default_factory=list)  # most recent first
    recent_orders:     list[dict] = field(default_factory=list)


@dataclass
class PersonalizationResult:
    boost:        float        # additive confidence boost
    fills:        list[str]    # human-readable explanations of what was inferred
    inferred_attrs: dict[str, str]  # attr_name → inferred_value


# ── Build profiles from order history ─────────────────────────────────────────

def load_profiles() -> dict[str, CustomerProfile]:
    """Parse order_history.csv and return a dict keyed by customer_id."""
    path = DATA_DIR / "order_history.csv"
    with open(path, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    # Group by customer
    by_customer: dict[str, list[dict]] = {}
    for row in rows:
        cid = row["customer_id"]
        by_customer.setdefault(cid, []).append(row)

    profiles: dict[str, CustomerProfile] = {}
    for cid, orders in by_customer.items():
        # Sort most-recent first
        orders.sort(key=lambda r: r["order_date"], reverse=True)
        profiles[cid] = _build_profile(cid, orders)

    return profiles


def _build_profile(cid: str, orders: list[dict]) -> CustomerProfile:
    name          = orders[0]["customer_name"]
    total         = len(orders)
    sparse        = total < 3

    family_aff:   dict[str, float] = {}
    material_aff: dict[str, float] = {}
    finish_aff:   dict[str, float] = {}
    metric_count  = 0

    for order in orders:
        weight = _order_weight(order["order_date"], order["quantity"])
        parsed = parse(order["catalog_description"], expand_abbrevs=True)

        if parsed.system == "metric":
            metric_count += 1

        if parsed.family:
            family_aff[parsed.family] = family_aff.get(parsed.family, 0.0) + weight
        if parsed.material:
            material_aff[parsed.material] = material_aff.get(parsed.material, 0.0) + weight
        if parsed.finish:
            finish_aff[parsed.finish] = finish_aff.get(parsed.finish, 0.0) + weight

    return CustomerProfile(
        customer_id      = cid,
        customer_name    = name,
        total_orders     = total,
        sparse           = sparse,
        metric_ratio     = metric_count / total if total > 0 else 0.0,
        family_affinity  = _normalize(family_aff),
        material_affinity= _normalize(material_aff),
        finish_affinity  = _normalize(finish_aff),
        recent_skus      = [o["sku"] for o in orders[:10]],
        recent_orders    = orders[:10],
    )


def _order_weight(date_str: str, quantity_str: str) -> float:
    try:
        order_date = datetime.strptime(date_str.strip(), "%Y-%m-%d")
    except ValueError:
        order_date = _REFERENCE_DATE
    days_ago = max(0, (_REFERENCE_DATE - order_date).days)
    recency  = 2.0 ** (-days_ago / _HALF_LIFE_DAYS)
    qty      = max(1, int(quantity_str.strip()))
    return recency * math.log1p(qty)


def _normalize(d: dict[str, float]) -> dict[str, float]:
    total = sum(d.values())
    if total == 0:
        return d
    return {k: v / total for k, v in sorted(d.items(), key=lambda x: -x[1])}


# ── Apply personalization at query time ───────────────────────────────────────

def personalize(
    query:     ParsedAttributes,
    candidate_parsed: dict,
    profile:   Optional[CustomerProfile],
) -> PersonalizationResult:
    """
    Return a confidence boost and fill explanations for a single candidate.
    Only boosts attributes that were NOT explicitly present in the query.
    """
    if profile is None or profile.sparse:
        return PersonalizationResult(boost=0.0, fills=[], inferred_attrs={})

    boost  = 0.0
    fills: list[str]           = []
    inferred: dict[str, str]   = {}

    # ── Family ───────────────────────────────────────────────────────────────
    if query.family is None:
        cf = candidate_parsed.get("family")
        if cf and cf in profile.family_affinity:
            affinity = profile.family_affinity[cf]
            b = affinity * _BOOST_FAMILY
            boost += b
            inferred["family"] = cf
            fills.append(
                f"product family '{cf.replace('_',' ')}' inferred from your order history "
                f"({profile.total_orders} orders, {affinity:.0%} preference)"
            )

    # ── Material ─────────────────────────────────────────────────────────────
    if query.material is None:
        cm = candidate_parsed.get("material")
        if cm and cm in profile.material_affinity:
            affinity = profile.material_affinity[cm]
            b = affinity * _BOOST_MATERIAL
            boost += b
            inferred["material"] = cm
            fills.append(
                f"material '{cm}' inferred from your order history "
                f"({affinity:.0%} of past orders)"
            )

    # ── Finish ────────────────────────────────────────────────────────────────
    if query.finish is None:
        cf = candidate_parsed.get("finish")
        if cf and cf in profile.finish_affinity:
            affinity = profile.finish_affinity[cf]
            b = affinity * _BOOST_FINISH
            boost += b
            inferred["finish"] = cf
            fills.append(
                f"finish '{cf.replace('_',' ')}' inferred from your order history "
                f"({affinity:.0%} of past orders)"
            )

    # ── Repeat SKU bonus ──────────────────────────────────────────────────────
    sku = candidate_parsed.get("sku", "")
    if sku and sku in profile.recent_skus:
        boost += 0.04
        fills.append("previously ordered SKU")
        inferred["repeat"] = "yes"

    boost = min(boost, _MAX_BOOST)
    return PersonalizationResult(boost=round(boost, 4), fills=fills, inferred_attrs=inferred)


# ── Referential query resolution ──────────────────────────────────────────────

def resolve_referential(
    query:   str,
    profile: Optional[CustomerProfile],
) -> list[dict]:
    """
    For queries like 'same washers as last time', resolve to recent orders.
    Returns a list of order dicts (most recent first, up to 5).
    """
    if profile is None or not profile.recent_orders:
        return []

    # Extract a product hint from the query
    hint = _extract_product_hint(query)

    if hint:
        matched = [
            o for o in profile.recent_orders
            if hint in o.get("catalog_description", "").lower()
        ]
        if matched:
            return matched[:3]

    return profile.recent_orders[:3]


def _extract_product_hint(query: str) -> Optional[str]:
    """Pull the most likely product noun from a referential query."""
    import re
    candidates = [
        ("washer",  "washer"),
        ("nut",     "nut"),
        ("bolt",    "bolt"),
        ("screw",   "screw"),
        ("rod",     "rod"),
    ]
    q = query.lower()
    for keyword, hint in candidates:
        if re.search(r'\b' + keyword + r'\b', q):
            return hint
    return None


# ── Conflict detection ────────────────────────────────────────────────────────

_BOOST_FAMILY   = 0.12   # was 0.08
_BOOST_MATERIAL = 0.10   # was 0.06
_BOOST_FINISH   = 0.07   # was 0.04
_MAX_BOOST      = 0.20   # was 0.12

_CONFLICT_THRESHOLD = 0.55   # affinity must exceed this to fire a conflict warning

def detect_conflicts(
    query: ParsedAttributes,
    profile: Optional[CustomerProfile],
) -> list[str]:
    """
    Detect when a query attribute explicitly contradicts a strong customer preference.
    Returns human-readable warning strings shown in the UI.

    Example: customer orders stainless 80% of the time, but query says 'steel' →
    "This customer usually orders stainless (80% of orders). Verify steel intent."
    """
    if profile is None or profile.sparse:
        return []

    warnings: list[str] = []

    # ── Material conflict ─────────────────────────────────────────────────────
    if query.material and profile.material_affinity:
        top_mat, top_aff = next(iter(profile.material_affinity.items()))
        if top_mat != query.material and top_aff >= _CONFLICT_THRESHOLD:
            warnings.append(
                f"This customer usually orders {top_mat} ({top_aff:.0%} of orders). "
                f"Verify '{query.material}' intent."
            )

    # ── Finish conflict ───────────────────────────────────────────────────────
    if query.finish and profile.finish_affinity:
        top_fin, top_aff = next(iter(profile.finish_affinity.items()))
        if top_fin != query.finish and top_aff >= _CONFLICT_THRESHOLD:
            warnings.append(
                f"This customer usually orders {top_fin.replace('_', ' ')} finish "
                f"({top_aff:.0%} of orders). "
                f"Verify '{query.finish.replace('_', ' ')}' intent."
            )

    # ── Metric/imperial system conflict ───────────────────────────────────────
    if query.system and profile.total_orders >= 5:
        expected = "metric" if profile.metric_ratio >= 0.70 else \
                   "imperial" if profile.metric_ratio <= 0.30 else None
        if expected and expected != query.system:
            warnings.append(
                f"This customer primarily orders {expected} parts "
                f"({profile.metric_ratio:.0%} metric). "
                f"Verify {query.system} sizing is intentional."
            )

    return warnings
