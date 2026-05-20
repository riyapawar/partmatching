"""
Unit tests for the matching pipeline.
Run: python -m pytest tests/ -v
"""
import pytest
from backend.abbreviations import expand, FAMILY_COMPAT, MATERIAL_COMPAT
from backend.attribute_parser import parse, is_referential, ParsedAttributes
from backend.scorer import _compute_confidence, confidence_label
from backend.personalization import detect_conflicts, CustomerProfile


# ── Abbreviation expansion ────────────────────────────────────────────────────

class TestAbbreviations:
    def test_shcs(self):
        assert "socket head cap screw" in expand("SHCS").lower()

    def test_bhcs(self):
        assert "button socket cap screw" in expand("BHCS").lower()

    def test_hhb(self):
        assert "heavy hex bolt" in expand("HHB").lower()

    def test_hdg(self):
        assert "hot dip galvanized" in expand("HDG").lower()

    def test_yellow_zn(self):
        assert "yellow zinc" in expand("YELLOW ZN").lower()

    def test_18_8_ss(self):
        result = expand("18-8 SS").lower()
        assert "stainless" in result

    def test_multiword_before_single(self):
        # "YELLOW ZN" should expand fully, not have "ZN" replaced separately
        result = expand("YELLOW ZN").lower()
        assert "yellow zinc" in result
        assert result.count("zinc") == 1


# ── Attribute parser ──────────────────────────────────────────────────────────

class TestParser:

    def test_metric_thread(self):
        p = parse("M8-1.25 x 30mm socket head cap screw")
        assert p.system == "metric"
        assert p.diameter_raw == "M8"
        assert abs(p.diameter_in - 8/25.4) < 0.001
        assert p.thread_pitch == 1.25

    def test_metric_bare(self):
        p = parse("M8 flat washer")
        assert p.system == "metric"
        assert p.diameter_raw == "M8"
        assert p.family == "flat_washer"

    def test_imperial_thread(self):
        p = parse("3/8-16 x 1-1/2 hex cap screw")
        assert p.system == "imperial"
        assert p.diameter_raw == "3/8"
        assert p.thread_pitch == 16.0
        assert abs(p.length_in - 1.5) < 0.01

    def test_imperial_bare_diameter(self):
        p = parse("SHCS 7/16 x 2-1/2")
        assert p.system == "imperial"
        assert p.diameter_raw == "7/16"
        assert abs(p.length_in - 2.5) < 0.01
        assert p.family == "socket_head_cap_screw"

    def test_numbered_thread(self):
        p = parse("#8-32 flat washer")
        assert p.system == "imperial"
        assert p.diameter_raw == "#8"
        assert p.family == "flat_washer"

    def test_feet_length(self):
        p = parse("1/2 rod 6 foot")
        assert p.family == "threaded_rod"
        assert abs(p.length_in - 72.0) < 0.1   # 6ft = 72 inches

    def test_mm_length(self):
        p = parse("M12 x 50mm button socket")
        assert p.system == "metric"
        assert abs(p.length_in - 50/25.4) < 0.001

    def test_material_stainless(self):
        p = parse("M8 x 30 socket head cap screw 18-8 stainless")
        assert p.material == "stainless"
        assert p.material_grade == "18-8"

    def test_material_brass(self):
        p = parse("brass hex nut 1/2-13")
        assert p.material == "brass"
        assert p.family == "hex_nut"

    def test_finish_zinc(self):
        p = parse("1/4-20 x 3/4 hex cap screw zinc")
        assert p.finish == "zinc"

    def test_finish_black_oxide(self):
        p = parse("M8 x 50mm BHCS alloy black oxide")
        assert p.finish == "black_oxide"
        assert p.material == "alloy"

    def test_negative_constraint(self):
        p = parse("lag screw NOT steel 3/8")
        assert any("steel" in c for c in p.negative_constraints)

    def test_referential(self):
        assert is_referential("the same washers as last time")
        assert is_referential("same bolt as last order")
        assert not is_referential("M8 flat washer")

    def test_specificity_zero(self):
        p = parse("something random with no fastener attributes")
        assert p.specificity == 0.0

    def test_specificity_high(self):
        p = parse("1/4-20 x 3/4 hex cap screw zinc steel")
        assert p.specificity >= 0.6

    def test_metric_imperial_segregation(self):
        metric   = parse("M8 flat washer")
        imperial = parse("5/16 flat washer")
        assert metric.system   == "metric"
        assert imperial.system == "imperial"


# ── Confidence formula ────────────────────────────────────────────────────────

class TestConfidence:

    def test_high_specificity_structured_dominates(self):
        # perfect structured match, zero semantic, fully specified query
        conf = _compute_confidence(points=100, max_pts=100, semantic=0.0, specificity=1.0)
        assert conf > 0.7

    def test_low_specificity_semantic_matters(self):
        # no structured attrs → semantic drives result
        conf_high = _compute_confidence(points=0, max_pts=0, semantic=0.9, specificity=0.0)
        conf_low  = _compute_confidence(points=0, max_pts=0, semantic=0.1, specificity=0.0)
        assert conf_high > conf_low

    def test_cap_applies(self):
        # perfect structured + semantic → capped at 0.95
        conf = _compute_confidence(points=100, max_pts=100, semantic=1.0, specificity=1.0)
        assert conf <= 0.95

    def test_vague_query_capped(self):
        # zero specificity → capped at 0.58
        conf = _compute_confidence(points=100, max_pts=100, semantic=1.0, specificity=0.0)
        assert conf <= 0.58 + 0.01

    def test_labels(self):
        assert confidence_label(0.80) == "strong"
        assert confidence_label(0.60) == "likely"
        assert confidence_label(0.35) == "possible"
        assert confidence_label(0.10) == "weak"


# ── Conflict detection ────────────────────────────────────────────────────────

class TestConflictDetection:

    def _make_profile(self, material_aff=None, finish_aff=None,
                      metric_ratio=0.5, total=10):
        return CustomerProfile(
            customer_id       = "TEST",
            customer_name     = "Test Customer",
            total_orders      = total,
            sparse            = total < 3,
            metric_ratio      = metric_ratio,
            material_affinity = material_aff or {},
            finish_affinity   = finish_aff or {},
            family_affinity   = {},
            recent_skus       = [],
            recent_orders     = [],
        )

    def test_material_conflict_fires(self):
        profile = self._make_profile(material_aff={"stainless": 0.85, "steel": 0.15})
        query   = parse("3/8-16 hex bolt steel zinc")
        warns   = detect_conflicts(query, profile)
        assert any("stainless" in w for w in warns)

    def test_material_no_conflict_when_matches(self):
        profile = self._make_profile(material_aff={"steel": 0.90})
        query   = parse("3/8-16 hex bolt steel")
        warns   = detect_conflicts(query, profile)
        assert not any("material" in w.lower() or "steel" in w.lower() for w in warns)

    def test_finish_conflict_fires(self):
        profile = self._make_profile(finish_aff={"zinc": 0.80, "plain": 0.20})
        query   = parse("hex bolt black oxide")
        warns   = detect_conflicts(query, profile)
        assert any("zinc" in w for w in warns)

    def test_system_conflict_fires(self):
        profile = self._make_profile(metric_ratio=0.95, total=10)
        query   = parse("3/8-16 hex bolt")   # imperial
        warns   = detect_conflicts(query, profile)
        assert any("metric" in w for w in warns)

    def test_sparse_profile_no_conflict(self):
        profile = self._make_profile(
            material_aff={"stainless": 0.90},
            total=2   # sparse
        )
        query = parse("steel hex bolt")
        warns = detect_conflicts(query, profile)
        assert warns == []

    def test_no_conflict_when_unspecified(self):
        profile = self._make_profile(material_aff={"stainless": 0.90})
        query   = parse("hex bolt 3/8-16")   # no material specified
        warns   = detect_conflicts(query, profile)
        assert warns == []


# ── Family compatibility ──────────────────────────────────────────────────────

class TestCompatibility:

    def test_hex_cap_compat_with_tap_bolt(self):
        assert "tap_bolt" in FAMILY_COMPAT["hex_cap_screw"]

    def test_socket_head_compat_with_button(self):
        assert "button_socket_cap_screw" in FAMILY_COMPAT["socket_head_cap_screw"]

    def test_flat_washer_no_compat(self):
        assert len(FAMILY_COMPAT["flat_washer"]) == 0

    def test_steel_alloy_compat(self):
        assert "alloy" in MATERIAL_COMPAT["steel"]

    def test_stainless_not_compat_with_steel(self):
        assert "steel" not in MATERIAL_COMPAT.get("stainless", set())
