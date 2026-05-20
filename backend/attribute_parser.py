"""
Parse a free-form fastener description (query or catalog) into structured attributes.
Works for both query strings and catalog description strings.
"""
import re
from dataclasses import dataclass, field
from typing import Optional

from backend.abbreviations import expand, FAMILY_ALIASES


# ── Dataclass ────────────────────────────────────────────────────────────────

@dataclass
class ParsedAttributes:
    system: Optional[str] = None            # 'metric' | 'imperial'
    family: Optional[str] = None            # canonical family slug
    diameter_raw: Optional[str] = None      # e.g. "3/8", "M8", "#8"
    diameter_in: Optional[float] = None     # always in inches for comparison
    thread_pitch: Optional[float] = None    # TPI (imperial) or mm pitch (metric)
    length_raw: Optional[str] = None
    length_in: Optional[float] = None       # always in inches
    material: Optional[str] = None          # 'steel'|'stainless'|'alloy'|'brass'
    material_grade: Optional[str] = None    # '18-8'|'316'|'a2'|'a4'
    finish: Optional[str] = None            # 'zinc'|'yellow_zinc'|'hdg'|'black_oxide'|'plain'|'mech_zinc'
    standard: Optional[str] = None
    negative_constraints: list = field(default_factory=list)
    specificity: float = 0.0                # fraction of key attrs present


# ── Named diameter → inch conversion ─────────────────────────────────────────

_IMPERIAL_DIAM_IN: dict[str, float] = {
    "#0": 0.060, "#1": 0.073, "#2": 0.086, "#3": 0.099,
    "#4": 0.112, "#5": 0.125, "#6": 0.138, "#8": 0.164,
    "#10": 0.190, "#12": 0.216,
    "1/4": 0.25, "5/16": 0.3125, "3/8": 0.375, "7/16": 0.4375,
    "1/2": 0.5,  "9/16": 0.5625, "5/8": 0.625, "3/4": 0.75,
    "7/8": 0.875, "1": 1.0, "1-1/4": 1.25, "1-1/2": 1.5,
}


def _frac_to_float(num: str, den: str) -> float:
    return int(num) / int(den)


def _mixed_to_float(whole: str, num: str, den: str) -> float:
    return int(whole) + int(num) / int(den)


def _imperial_diam_in(raw: str) -> Optional[float]:
    """Convert imperial diameter string to inches."""
    if raw in _IMPERIAL_DIAM_IN:
        return _IMPERIAL_DIAM_IN[raw]
    # Try fraction
    m = re.match(r'^(\d+)/(\d+)$', raw)
    if m:
        return _frac_to_float(m.group(1), m.group(2))
    # Try numbered  #8 etc.
    m = re.match(r'^#(\d+)$', raw)
    if m:
        key = f"#{m.group(1)}"
        return _IMPERIAL_DIAM_IN.get(key)
    return None


# ── Regex patterns ────────────────────────────────────────────────────────────

# Metric thread: M8, M8-1.25, m12-1.75
_METRIC_THREAD = re.compile(
    r'\bM(\d+(?:\.\d+)?)\b(?:-(\d+(?:\.\d+)?))?',
    re.IGNORECASE,
)

# Imperial fraction thread: 3/8-16, 1/4-20
_IMPERIAL_FRAC_THREAD = re.compile(r'\b(\d+)/(\d+)-(\d+)\b')

# Numbered thread: #8-32, #10-24
_NUMBERED_THREAD = re.compile(r'#(\d+)-(\d+)\b')

# Lengths — metric
_METRIC_LEN = re.compile(r'(?:X\s*)?(\d+(?:\.\d+)?)\s*MM\b', re.IGNORECASE)

# Lengths — imperial (with leading X separator)
_IMPERIAL_LEN_MIXED  = re.compile(r'X\s*(\d+)-(\d+)/(\d+)', re.IGNORECASE)  # X 1-1/2
_IMPERIAL_LEN_FRAC   = re.compile(r'X\s*(\d+)/(\d+)',        re.IGNORECASE)  # X 3/4
_IMPERIAL_LEN_FEET   = re.compile(r'(\d+(?:\.\d+)?)\s*(?:FT|foot|feet)\b', re.IGNORECASE)  # 6FT / 6 foot
_IMPERIAL_LEN_INT    = re.compile(r'X\s*(\d+(?:\.\d+)?)"?',  re.IGNORECASE) # X 2 or X 2"

# Bare diameter (no TPI specified) — fallback after thread patterns fail
_IMPERIAL_BARE_DIAM  = re.compile(r'\b(\d+)/(\d+)\b')   # 7/16, 3/8, 5/16 …
_NUMBERED_BARE_DIAM  = re.compile(r'#(\d+)\b(?!-\d)')   # #8 (no -TPI)

# Standalone inch lengths (no X, but followed by " or inch)
_STANDALONE_INCH = re.compile(r'\b(\d+(?:\.\d+)?)"', re.IGNORECASE)

# Negative constraints: "not steel", "no zinc", "without brass"
_NEGATIVE = re.compile(
    r'\b(?:not|no|non|without|except|excluding)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)',
    re.IGNORECASE,
)

# Referential query
_REFERENTIAL = re.compile(
    r'\b(same|last\s+time|as\s+before|again|reorder|re-order|previous)\b',
    re.IGNORECASE,
)

# Family patterns — checked in order, first match wins
_FAMILY_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'socket\s+head\s+cap\s+scr(?:ew)?',               re.I), 'socket_head_cap_screw'),
    (re.compile(r'button\s+soc(?:ket)?\s+cap\s+scr(?:ew)?',        re.I), 'button_socket_cap_screw'),
    (re.compile(r'button\s+head\s+cap\s+scr(?:ew)?',               re.I), 'button_socket_cap_screw'),
    (re.compile(r'button\s+socket\s+cap\s+scr(?:ew)?',             re.I), 'button_socket_cap_screw'),
    (re.compile(r'(?:hex\s+head\s+)?lag\s+scr(?:ew)?',             re.I), 'lag_screw'),
    (re.compile(r'heavy\s+hex\s+bolt',                              re.I), 'heavy_hex_bolt'),
    (re.compile(r'phillips\s+pan\s+(?:head\s+)?machine\s+scr(?:ew)?', re.I), 'phillips_pan_machine_screw'),
    (re.compile(r'pan\s+head\s+machine\s+scr(?:ew)?',              re.I), 'pan_head_machine_screw'),
    (re.compile(r'machine\s+scr(?:ew)?',                            re.I), 'machine_screw'),
    (re.compile(r'tap\s+bolt',                                      re.I), 'tap_bolt'),
    (re.compile(r'hex\s+cap\s+scr(?:ew)?',                         re.I), 'hex_cap_screw'),
    (re.compile(r'hex\s+bolt',                                      re.I), 'hex_bolt'),
    (re.compile(r'threaded\s+rod',                                  re.I), 'threaded_rod'),
    (re.compile(r'thread\s+rod',                                    re.I), 'threaded_rod'),
    (re.compile(r'\brod\b',                                         re.I), 'threaded_rod'),
    (re.compile(r'flat\s+wash(?:er|r)',                             re.I), 'flat_washer'),
    (re.compile(r'lock\s+wash(?:er|r)',                             re.I), 'lock_washer'),
    (re.compile(r'hex\s+nut',                                       re.I), 'hex_nut'),
    (re.compile(r'cap\s+scr(?:ew)?',                                re.I), 'cap_screw'),
]

# Material patterns
_MATERIAL_PATTERNS: list[tuple[re.Pattern, str, Optional[str]]] = [
    # (pattern, material_category, grade)
    (re.compile(r'18-8\s+s(?:tainless)?(?:\s+steel)?', re.I), 'stainless', '18-8'),
    (re.compile(r'316\s+s(?:tainless)?(?:\s+steel)?',  re.I), 'stainless', '316'),
    (re.compile(r'304\s+s(?:tainless)?(?:\s+steel)?',  re.I), 'stainless', '304'),
    (re.compile(r'a2\s+s(?:tainless)?(?:\s+steel)?',   re.I), 'stainless', 'a2'),
    (re.compile(r'a4\s+s(?:tainless)?(?:\s+steel)?',   re.I), 'stainless', 'a4'),
    (re.compile(r'stainless(?:\s+steel)?',              re.I), 'stainless', None),
    (re.compile(r'\bss\b',                              re.I), 'stainless', None),
    (re.compile(r'\balloy\b',                           re.I), 'alloy',     None),
    (re.compile(r'\bbrass\b',                           re.I), 'brass',     None),
    (re.compile(r'\bbronze\b',                          re.I), 'bronze',    None),
    (re.compile(r'\bsteel\b',                           re.I), 'steel',     None),
]

# Finish patterns
_FINISH_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'hot\s+dip\s+galvan(?:ized)?',    re.I), 'hdg'),
    (re.compile(r'\bhdg\b',                         re.I), 'hdg'),
    (re.compile(r'yellow\s+zinc',                   re.I), 'yellow_zinc'),
    (re.compile(r'yellow\s+zn\b',                   re.I), 'yellow_zinc'),
    (re.compile(r'\byz\b',                           re.I), 'yellow_zinc'),
    (re.compile(r'mech(?:anical)?\s+zinc',           re.I), 'mech_zinc'),
    (re.compile(r'mech(?:anical)?\s+zn\b',           re.I), 'mech_zinc'),
    (re.compile(r'black\s+oxide',                   re.I), 'black_oxide'),
    (re.compile(r'\bplain\b',                        re.I), 'plain'),
    (re.compile(r'\bzinc\b',                         re.I), 'zinc'),
    (re.compile(r'\bzn\b',                           re.I), 'zinc'),
    (re.compile(r'\bzc\b',                           re.I), 'zinc'),
]

# Standard patterns
_STANDARD_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r'ASME\s+B18\.\d+(?:\.\d+)?', re.I), 'asme'),
    (re.compile(r'DIN\s+\d+',                 re.I), 'din'),
    (re.compile(r'ISO\s+\d+',                 re.I), 'iso'),
    (re.compile(r'IFI\s+\d+',                 re.I), 'ifi'),
    (re.compile(r'ASTM\s+A\d+',               re.I), 'astm'),
]


# ── Main parse function ───────────────────────────────────────────────────────

def parse(text: str, expand_abbrevs: bool = True) -> ParsedAttributes:
    """
    Parse a description string into structured attributes.
    Set expand_abbrevs=True for query strings, False for catalog descriptions
    that should already be in canonical form.
    """
    attrs = ParsedAttributes()
    expanded = expand(text) if expand_abbrevs else text

    # ── Negative constraints ──────────────────────────────────────────────────
    attrs.negative_constraints = [m.group(1).lower() for m in _NEGATIVE.finditer(text)]

    # ── Thread / diameter ─────────────────────────────────────────────────────
    # Try metric first
    m = _METRIC_THREAD.search(expanded)
    if m:
        diam_mm = float(m.group(1))
        attrs.system = 'metric'
        attrs.diameter_raw = f"M{m.group(1)}"
        attrs.diameter_in = diam_mm / 25.4
        if m.group(2):
            attrs.thread_pitch = float(m.group(2))  # pitch in mm

    else:
        # Try imperial fraction
        m = _IMPERIAL_FRAC_THREAD.search(expanded)
        if m:
            attrs.system = 'imperial'
            attrs.diameter_raw = f"{m.group(1)}/{m.group(2)}"
            attrs.diameter_in = _frac_to_float(m.group(1), m.group(2))
            attrs.thread_pitch = float(m.group(3))  # TPI
        else:
            # Try numbered (with TPI)
            m = _NUMBERED_THREAD.search(expanded)
            if m:
                attrs.system = 'imperial'
                num = int(m.group(1))
                attrs.diameter_raw = f"#{num}"
                attrs.diameter_in = _IMPERIAL_DIAM_IN.get(f"#{num}")
                attrs.thread_pitch = float(m.group(2))
            else:
                # Bare imperial fraction (no TPI) — e.g. "7/16 x 2-1/2", "5/16 hex nut"
                m = _IMPERIAL_BARE_DIAM.search(expanded)
                if m:
                    # Avoid picking up a length fraction (preceded by X)
                    start = m.start()
                    before = expanded[max(0, start - 3):start].upper().strip()
                    if 'X' not in before:
                        attrs.system = 'imperial'
                        attrs.diameter_raw = f"{m.group(1)}/{m.group(2)}"
                        attrs.diameter_in = _frac_to_float(m.group(1), m.group(2))
                else:
                    # Bare numbered diameter (no TPI) — e.g. "#8 flat washer"
                    m = _NUMBERED_BARE_DIAM.search(expanded)
                    if m:
                        attrs.system = 'imperial'
                        num = int(m.group(1))
                        attrs.diameter_raw = f"#{num}"
                        attrs.diameter_in = _IMPERIAL_DIAM_IN.get(f"#{num}")

    # ── Length ────────────────────────────────────────────────────────────────
    # Feet always wins
    m = _IMPERIAL_LEN_FEET.search(expanded)
    if m:
        attrs.length_raw = f"{m.group(1)}ft"
        attrs.length_in = float(m.group(1)) * 12.0
    else:
        # Metric mm
        m = _METRIC_LEN.search(expanded)
        if m and attrs.system == 'metric':
            attrs.length_raw = f"{m.group(1)}mm"
            attrs.length_in = float(m.group(1)) / 25.4
        else:
            # Imperial with X prefix — mixed fraction first
            m = _IMPERIAL_LEN_MIXED.search(expanded)
            if m:
                attrs.length_raw = f"{m.group(1)}-{m.group(2)}/{m.group(3)}"
                attrs.length_in = _mixed_to_float(m.group(1), m.group(2), m.group(3))
            else:
                m = _IMPERIAL_LEN_FRAC.search(expanded)
                if m:
                    attrs.length_raw = f"{m.group(1)}/{m.group(2)}"
                    attrs.length_in = _frac_to_float(m.group(1), m.group(2))
                else:
                    m = _IMPERIAL_LEN_INT.search(expanded)
                    if m:
                        attrs.length_raw = m.group(1)
                        attrs.length_in = float(m.group(1))
                    else:
                        # standalone inch e.g. 2"
                        m = _STANDALONE_INCH.search(expanded)
                        if m and attrs.system == 'imperial':
                            attrs.length_raw = f"{m.group(1)}\""
                            attrs.length_in = float(m.group(1))

    # ── Product family ────────────────────────────────────────────────────────
    for pattern, family in _FAMILY_PATTERNS:
        if pattern.search(expanded):
            attrs.family = family
            break

    # ── Material ──────────────────────────────────────────────────────────────
    for pattern, mat, grade in _MATERIAL_PATTERNS:
        if pattern.search(expanded):
            attrs.material = mat
            attrs.material_grade = grade
            break

    # ── Finish ────────────────────────────────────────────────────────────────
    for pattern, finish in _FINISH_PATTERNS:
        if pattern.search(expanded):
            attrs.finish = finish
            break

    # ── Standard ─────────────────────────────────────────────────────────────
    for pattern, std in _STANDARD_PATTERNS:
        if pattern.search(expanded):
            attrs.standard = std
            break

    # ── Specificity ───────────────────────────────────────────────────────────
    key_attrs = ['family', 'diameter_in', 'thread_pitch', 'length_in', 'material', 'finish']
    present = sum(1 for a in key_attrs if getattr(attrs, a) is not None)
    attrs.specificity = present / len(key_attrs)

    return attrs


def is_referential(text: str) -> bool:
    """Return True if the query appears to reference a prior order."""
    return bool(_REFERENTIAL.search(text))


def build_search_text(description: str, parsed: ParsedAttributes) -> str:
    """
    Build an enriched search string for BM25 + embedding indexing.
    Combines original description, expanded form, and key attribute tokens.
    """
    parts = [description.lower(), expand(description).lower()]

    if parsed.family:
        parts.append(parsed.family.replace('_', ' '))
    if parsed.material:
        parts.append(parsed.material)
    if parsed.material_grade:
        parts.append(parsed.material_grade)
    if parsed.finish:
        parts.append(parsed.finish.replace('_', ' '))
    if parsed.system:
        parts.append(parsed.system)

    return ' '.join(parts)
