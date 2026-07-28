"""Generate cross-implementation conformance fixtures from the Python reference.

Run:  python test/gen_fixtures.py
The JS conformance suite consumes what this writes; the two implementations must
agree, so the fixtures must come from Python and never from JS.
"""
from __future__ import annotations

import json
import math
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).parent
FIX = HERE / "fixtures"
# Prefer an installed lcert-verify; fall back to a sibling checkout so this works
# both standalone and inside a monorepo layout.
try:
    import lcert_verify as L
except ImportError:  # pragma: no cover
    sys.path.insert(0, str(HERE.parent.parent / "lcert-verify" / "src"))
    import lcert_verify as L
from lcert_verify import _verifier as V  # noqa: E402

CASES = [
    ("admit", [(0.10, 0.11, 0.05), (0.09, 0.10, 0.04), (0.12, 0.13, 0.06)], 0.30, 0.02),
    ("reject_straddle", [(0.10, 0.11, 0.05), (0.29, 0.31, 0.05)], 0.30, 0.02),
    ("empty_loci", [], 0.30, 0.00),
    ("superthreshold", [(0.55, 0.60, 0.80), (0.58, 0.62, 0.85)], 0.30, 0.01),
    ("tight_margin", [(0.2990, 0.2995, 0.05)], 0.30, 0.0),
    ("wide_dose", [(0.10, 0.12, 0.05), (0.11, 0.13, 0.06)], 0.30, 0.15),
]


def main() -> int:
    if FIX.exists():
        shutil.rmtree(FIX)
    FIX.mkdir(parents=True)

    cases_meta = []
    for name, loci, thr, dd in CASES:
        cert = L.gate_cert(name, budget=0.05, safety=1.5, n_photons=100.0,
                           thr=thr, delta_dose=dd, loci=loci)
        d = FIX / name
        L.make_bundle(d, gate_certs=[cert],
                      kpis=[{"key": "case", "value": name}],
                      prereg={"case": name, "declared": "before measurement"})
        res = L.verify_bundle(d)
        cases_meta.append({
            "dir": name,
            "python_ok": res["ok"],
            "python_verdicts": {cert["name"]: V.rederive_gate_verdict(cert)},
        })
    (FIX / "cases.json").write_text(json.dumps(cases_meta, indent=1, sort_keys=True))

    xs = [0.0, 0.1, 0.5, 1.0, 1.2815515655446004, 1.6448536269514722,
          2.0, 2.5758293035489004, 3.0, 4.0, 5.0, 0.05, 0.001]
    (FIX / "erfc_reference.json").write_text(
        json.dumps([[repr(x), math.erfc(x)] for x in xs], indent=1))

    # Certificate-shaped: float leaves, integers only at format-integral keys.
    # See the CONTRACT note on canon() in src/lcert.js.
    canon_cases = [
        {"b": 1.0, "a": 2.0},
        {"z": [1.0, 2.0, {"y": True, "x": None}]},
        {"s": "quote\"and\\slash", "n": 1.5},
        {"nested": {"deep": {"deeper": [1.0, [2.0, [3.0]]]}}},
        {"seed": 149, "n_loci": 3, "budget": 0.05},
        {"thr": 0.3, "delta_dose": 0.02, "loci": {"I_lo": [0.1, 0.09]}},
        [],
        {},
    ]
    (FIX / "canon_reference.json").write_text(
        json.dumps([[json.dumps(o), V._canon(o).decode()] for o in canon_cases], indent=1))

    floats = [100.0, 0.05, 1e-5, 1.5, 0.1, 1e-7, 0.0001, 1234.5678, 3.375e-4,
              0.0, -0.5, 2.5e-8, 9.87654321e15, 1e16, 0.30000000000000004]
    (FIX / "float_repr_reference.json").write_text(
        json.dumps([[repr(x), repr(x)] for x in floats], indent=1))

    kappa_cases = []
    for budget in (0.05, 0.01, 1e-4):
        k = L.kappa_for_budget(budget)
        K = 2.0 * k * k * 1.5 * 1.5 / 100.0
        kappa_cases.append({"label": f"clean_{budget}", "budget": budget, "safety": 1.5,
                            "n_photons": 100.0, "kappa": k, "K": K,
                            "python_clean": L.check_kappa_K(budget, 1.5, 100.0, k, K) == []})
        kappa_cases.append({"label": f"bad_kappa_{budget}", "budget": budget, "safety": 1.5,
                            "n_photons": 100.0, "kappa": k * 1.01, "K": K,
                            "python_clean": L.check_kappa_K(budget, 1.5, 100.0, k * 1.01, K) == []})
        kappa_cases.append({"label": f"bad_K_{budget}", "budget": budget, "safety": 1.5,
                            "n_photons": 100.0, "kappa": k, "K": K * (1 + 1e-9),
                            "python_clean": L.check_kappa_K(
                                budget, 1.5, 100.0, k, K * (1 + 1e-9)) == []})
    (FIX / "kappa_cases.json").write_text(json.dumps(kappa_cases, indent=1))

    print(f"wrote {len(cases_meta)} bundle fixtures, {len(xs)} erfc points, "
          f"{len(canon_cases)} canon cases, {len(kappa_cases)} kappa cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
