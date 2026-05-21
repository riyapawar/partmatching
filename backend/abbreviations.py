"""
Fastener industry abbreviation expansion.
Sorted longest-first so multi-word abbreviations match before their components.
"""
import re

# Maps abbreviation (uppercase) → expansion (lowercase)
_RAW: dict[str, str] = {
    # ── Query shorthands ──────────────────────────────────────────────────────
    "SHCS":         "socket head cap screw",
    "BHCS":         "button socket cap screw",
    "BHSC":         "button socket cap screw",
    "HHB":          "heavy hex bolt",
    "HHN":          "heavy hex nut",
    "HCS":          "hex cap screw",
    "FHCS":         "flat head cap screw",
    "PHMS":         "pan head machine screw",
    "RHMS":         "round head machine screw",
    "FSCS":         "flat socket cap screw",
    "ALLEN BOLT":   "socket head cap screw",
    "ALLEN SCREW":  "socket head cap screw",
    "ALLEN":        "socket head cap screw",
    "HEX SOCKET":   "socket head cap screw",

    # ── Catalog description tokens ────────────────────────────────────────────
    "HX HD LAG SCR":          "hex head lag screw",
    "HX HD":                  "hex head",
    "LAG SCR":                "lag screw",
    "CAP SCR":                "cap screw",
    "SOC HEAD CAP SCREW":     "socket head cap screw",
    "SOC HEAD CAP SCR":       "socket head cap screw",
    "SOC HEAD":               "socket head",
    "BUTTON SOC CAP SCREW":   "button socket cap screw",
    "BUTTON SOC CAP SCR":     "button socket cap screw",
    "FULL THREAD ROD":        "threaded rod",
    "FULL THREAD":            "full thread",
    "FT ROD":                 "threaded rod",
    "FLAT WSHR":              "flat washer",
    "LOCK WSHR":              "lock washer",

    # ── Finishes ──────────────────────────────────────────────────────────────
    "HOT DIP GALV":    "hot dip galvanized",
    "HOT DIP GALVANIZED": "hot dip galvanized",
    "MECH ZINC":       "mechanical zinc",
    "MECH ZN":         "mechanical zinc",
    "YELLOW ZINC":     "yellow zinc",
    "YELLOW ZN":       "yellow zinc",
    "BLACK OXIDE":     "black oxide",
    "BLK OXIDE":       "black oxide",
    "BLK OX":          "black oxide",
    "HDG":             "hot dip galvanized",
    "YZ":              "yellow zinc",
    "ZC":              "zinc",
    "ZN":              "zinc",

    # ── Materials ─────────────────────────────────────────────────────────────
    "18-8 SS":   "18-8 stainless steel",
    "316 SS":    "316 stainless steel",
    "304 SS":    "304 stainless steel",
    "A2 SS":     "a2 stainless steel",
    "A4 SS":     "a4 stainless steel",
    "SS":        "stainless steel",

    # ── Drive / head styles ───────────────────────────────────────────────────
    "PH":    "phillips",
    "PHIL":  "phillips",
    "SL":    "slotted",
    "HEX":   "hex",
    "SOC":   "socket",

    # ── Miscellaneous ─────────────────────────────────────────────────────────
    "WSHR":  "washer",
    "SCR":   "screw",
    "NUT":   "nut",
    "CL":    "class",
    "GR":    "grade",
    "FT":    "foot",
    "BTN":   "button",
    "ASME":  "asme",
    "ASTM":  "astm",
    "ISO":   "iso",
    "DIN":   "din",
    "IFI":   "ifi",
}

# Pre-compile one regex per entry, longest patterns first to prevent shadowing
_ENTRIES: list[tuple[re.Pattern, str]] = [
    (re.compile(r'\b' + re.escape(k) + r'\b', re.IGNORECASE), v)
    for k, v in sorted(_RAW.items(), key=lambda x: -len(x[0]))
]


def expand(text: str) -> str:
    """Replace all known abbreviations in *text* with their long forms."""
    for pattern, replacement in _ENTRIES:
        text = pattern.sub(replacement, text)
    return text


# ── Family synonym sets (used by attribute_parser) ───────────────────────────

FAMILY_ALIASES: dict[str, str] = {
    # Canonical name → canonical name (identity, for completeness)
    "socket head cap screw":          "socket_head_cap_screw",
    "button socket cap screw":        "button_socket_cap_screw",
    "button head cap screw":          "button_socket_cap_screw",
    "hex cap screw":                  "hex_cap_screw",
    "hex bolt":                       "hex_bolt",
    "heavy hex bolt":                 "heavy_hex_bolt",
    "tap bolt":                       "tap_bolt",
    "lag screw":                      "lag_screw",
    "hex head lag screw":             "lag_screw",
    "machine screw":                  "machine_screw",
    "pan head machine screw":         "pan_head_machine_screw",
    "phillips pan machine screw":     "phillips_pan_machine_screw",
    "phillips pan head machine screw":"phillips_pan_machine_screw",
    "hex nut":                        "hex_nut",
    "flat washer":                    "flat_washer",
    "lock washer":                    "lock_washer",
    "threaded rod":                   "threaded_rod",
    "full thread rod":                "threaded_rod",
    "cap screw":                      "cap_screw",
}

# Which families are close-enough substitutes (partial credit in scorer)
FAMILY_COMPAT: dict[str, set[str]] = {
    "hex_cap_screw":              {"hex_bolt", "tap_bolt", "heavy_hex_bolt"},
    "hex_bolt":                   {"hex_cap_screw", "tap_bolt", "heavy_hex_bolt"},
    "tap_bolt":                   {"hex_cap_screw", "hex_bolt"},
    "heavy_hex_bolt":             {"hex_bolt", "hex_cap_screw"},
    "socket_head_cap_screw":      {"button_socket_cap_screw", "cap_screw"},
    "button_socket_cap_screw":    {"socket_head_cap_screw", "cap_screw"},
    "cap_screw":                  {"socket_head_cap_screw", "button_socket_cap_screw",
                                   "hex_cap_screw"},
    "machine_screw":              {"pan_head_machine_screw", "phillips_pan_machine_screw"},
    "pan_head_machine_screw":     {"machine_screw", "phillips_pan_machine_screw"},
    "phillips_pan_machine_screw": {"machine_screw", "pan_head_machine_screw"},
    "threaded_rod":               set(),
    "lag_screw":                  set(),
    "hex_nut":                    set(),
    "flat_washer":                set(),
    "lock_washer":                set(),
}

# Material compatibility (same broad category)
MATERIAL_COMPAT: dict[str, set[str]] = {
    "steel":     {"alloy"},
    "alloy":     {"steel"},
    "stainless": {"stainless"},
    "brass":     set(),
    "bronze":    set(),
}

# Stainless sub-grade families (18-8/A2/304 are interchangeable; 316/A4 are interchangeable)
STAINLESS_GRADE_COMPAT: dict[str, set[str]] = {
    "18-8": {"a2", "304"},
    "a2":   {"18-8", "304"},
    "304":  {"18-8", "a2"},
    "316":  {"a4"},
    "a4":   {"316"},
}

# Finish compatibility (zinc sub-types are loosely compatible)
FINISH_COMPAT: dict[str, set[str]] = {
    "zinc":          {"yellow_zinc", "mech_zinc"},
    "yellow_zinc":   {"zinc", "mech_zinc"},
    "mech_zinc":     {"zinc", "yellow_zinc"},
    "hdg":           set(),
    "black_oxide":   set(),
    "plain":         set(),
}
