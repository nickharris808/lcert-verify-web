# lcert-verify-web

[![ci](https://github.com/nickharris808/lcert-verify-web/actions/workflows/ci.yml/badge.svg)](https://github.com/nickharris808/lcert-verify-web/actions/workflows/ci.yml)
![license](https://img.shields.io/badge/license-Apache--2.0-blue)
![node](https://img.shields.io/badge/node-%E2%89%A518-blue)
![dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)
![conformance](https://img.shields.io/badge/conformance-99%20checks%20vs%20Python-brightgreen)

**Drop a certificate on a web page. Get a verdict in milliseconds. Nothing is uploaded.**

A browser-side re-derivation of LCERT-1 certificate verdicts. Zero dependencies, no build step,
no WASM toolchain, no server. Open `index.html` and it works — including from a `file://` URL on a
laptop with the network cable pulled out.

## Why this exists

Certificates are only useful if the person who distrusts you can check them. That person will not
install your Python package, and will not paste your mask geometry into someone's cloud endpoint.
So the checker has to run where they already are, on hardware they control, with nothing leaving
the tab.

## Install

> **Not yet on npm.** Clone it — there is no build step:
>
> ```
> git clone https://github.com/nickharris808/lcert-verify-web.git
> ```

```
npm install lcert-verify-web
```

Or just copy `src/lcert.js`. It is one file with no imports.

## 30-second quickstart

```bash
git clone <this repo> && cd verify-web
npm run serve          # or: python3 -m http.server 8000
open http://localhost:8000
```

Drag a bundle directory onto the page. You get `VERIFIED` or `NOT VERIFIED`, the per-certificate
locus breakdown, the Merkle root, and the bundle fingerprint.

Programmatically:

```js
import { verifyBundle } from "lcert-verify-web";

const res = await verifyBundle(bundleText, { "preregistration.json": bytes }, expectedSha);
console.log(res.ok, res.errors, res.fingerprint);
```

## The verdict is recomputed, not read

`rederiveGateVerdict()` redoes the per-locus interval classification from the certificate's
primitive quantities. A certificate whose recorded verdict disagrees with the re-derivation is
rejected, and the error names the field:

```
[clip_a] recorded interval_admit=true but re-derived false
```

## Faithfulness to the reference implementation

The interval arithmetic uses only IEEE-754 double `+ - * <`, `Math.max`, and `nextafter`. Those
are correctly rounded by the standard and JavaScript numbers *are* IEEE doubles — the same ones
CPython uses — so the per-locus classification is **bit-identical** to the Python verifier.

Two honest exceptions, both measured rather than asserted:

1. **`erfc`** is not in the JS standard library, so this package carries its own. It is accurate to
   ~1e-14 absolute against Python's `math.erfc` (worst observed: **3.614e-14**), against a format
   tolerance of 1e-12. The conformance suite checks this on every run rather than assuming it.
2. **Canonical-JSON round-tripping is not reproduced here.** JSON cannot distinguish an integer
   from an integral float, so a JS re-serialization can differ from the producer's bytes for
   reasons that are not tampering. Byte-level integrity is instead established by the
   **fingerprint** — pass `expectedSha`, obtained out of band. It catches strictly more than the
   canonical check would.

## Conformance suite

```
npm run fixtures     # generates fixtures from the Python reference implementation
npm test
```

```
worst erfc abs error vs Python: 3.614e-14
99 passed, 0 failed
```

The fixtures are produced by the *Python* implementation, so this is a genuine two-implementation
comparison — six bundle cases (admit, straddle-reject, empty, super-threshold, tight-margin,
wide-dose), erfc across 13 points, float rendering across 15 values, canonical JSON, and kappa/K
tamper cases.


## Honest scope — what this proves, and what it does not

| Question | Answer |
|---|---|
| Is the artifact internally consistent, and does its verdict follow from its own numbers? | **Yes, always checked.** |
| Was the artifact altered after it was produced, in a way that leaves an inconsistency? | **Yes, always caught.** |
| Was the artifact altered *consistently* — inputs and verdict edited together? | **Only with an out-of-band fingerprint.** Without one this tool returns `UNVERIFIED` and refuses to assert. |
| Do the numbers in it describe your physical design? | **Never checked.** That needs sound enclosures over process models — a separate commercial product. |

The rule this code follows: **when in doubt, refuse.** A verdict of `UNVERIFIED` is not a
failure of your certificate; it is this tool declining to claim something it has not established.

## What is not checked

The physics. This confirms a certificate is internally consistent, untampered, and that its verdict
follows from its own numbers. It does not confirm those numbers describe your design. Producing a
meaningful certificate needs the certification engine, which is a separate closed product.

## License

Apache-2.0.

---

## The rest of the toolkit

**A recorded verdict is a claim to be checked, never an input to be trusted.** Nine repositories are built on it.

The whole story, and the objections answered, live at **[certified-oss](https://github.com/nickharris808/certified-oss)** — start there if this is the first one you have opened.

| | |
|---|---|
| [**lcert-verify**](https://github.com/nickharris808/lcert-verify) | Re-derive a manufacturing certificate's verdict. Stdlib only. |
| [**equiv-receipt**](https://github.com/nickharris808/equiv-receipt) | Prove two circuits equivalent, with a receipt anyone can re-check. |
| [**prereg-seal**](https://github.com/nickharris808/prereg-seal) | Seal acceptance criteria before you measure. |
| [**cert-atlas**](https://github.com/nickharris808/cert-atlas) | 21 labelled forgeries and a metric no degenerate verifier can win. |
| [**certified-mcp**](https://github.com/nickharris808/certified-mcp) | The above, as tools your AI agent can call. |
| [**lcert-verify-web**](https://github.com/nickharris808/lcert-verify-web) | The verifier in a browser. Nothing uploaded. |

**Try it now, no install:** [🔏 the verifier Space](https://huggingface.co/spaces/nickh007/cert-verifier) ·
**Browse the forgeries:** [📊 the atlas dataset](https://huggingface.co/datasets/nickh007/cert-atlas)

### Where the free edition stops

Everything here **checks**. None of it **produces** a certificate that is physically meaningful —
that needs sound enclosures over real process models, which is a separate commercial product. If
you need certificates rather than a way to check them, that is the conversation to have.

## Documentation

- **[TUTORIAL.md](TUTORIAL.md)** — a worked walkthrough
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — the errors you will actually hit
- **[PERFORMANCE.md](PERFORMANCE.md)** — measured, including what was not optimised
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contributing

Portfolio-wide: **[Tutorial](https://github.com/nickharris808/certified-oss/blob/main/TUTORIAL.md)**
· **[Concepts](https://github.com/nickharris808/certified-oss/blob/main/CONCEPTS.md)**
· **[FAQ](https://github.com/nickharris808/certified-oss/blob/main/FAQ.md)**
· **[Architecture](https://github.com/nickharris808/certified-oss/blob/main/ARCHITECTURE.md)**
· **[API reference](https://nickharris808.github.io/certified-oss/api/)**

---

**A recorded verdict is a claim to be checked, never an input to be trusted.**

`lcert-verify-web` is one of nine repositories built on that. The whole story, and the objections answered,
live at **[certified-oss](https://github.com/nickharris808/certified-oss)** — start there if this
is the first one you have opened.
