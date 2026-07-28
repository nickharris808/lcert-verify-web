---
title: LCERT Certificate Verifier
emoji: 🔏
colorFrom: indigo
colorTo: green
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
short_description: Verify a certificate in your browser. Nothing is uploaded.
tags:
  - verification
  - formal-methods
  - eda
  - certificates
---

# LCERT Certificate Verifier

**Drop a certificate on this page. Get a verdict in milliseconds. Nothing is uploaded.**

This Space is **fully static** — the verifier is plain JavaScript running in your tab. No server
sees your data, and you can pull the network cable and it still works.

## Try it in 30 seconds

Press **a forged verdict 😈**. The certificate is byte-for-byte valid except that its recorded
outcome is a lie — and the page catches it, naming the field:

```
[clip_a] recorded interval_admit=false but re-derived true
```

Then press **a valid ADMIT certificate** to see the other outcome, or drop a bundle directory of
your own.

## Why the verdict can be trusted

The verdict is **recomputed** from the certificate's own numbers, never read from it. The per-locus
interval arithmetic uses only correctly rounded IEEE-754 operations, so this browser
implementation is **bit-identical** to the Python reference — a property measured by a 90-check
conformance suite, not asserted.

## What is not checked

**The physics.** This confirms a certificate is internally consistent, untampered, and that its
verdict follows from its own numbers. Whether those numbers describe *your* design needs sound
enclosures over physical models — a separate commercial product.

## The rest of the toolkit

| | |
|---|---|
| [**lcert-verify**](https://github.com/nickharris808/lcert-verify) | The Python reference this browser build is checked against. |
| [**lcert-verify-web**](https://github.com/nickharris808/lcert-verify-web) | The source of this page. |
| [**equiv-receipt**](https://github.com/nickharris808/equiv-receipt) | Prove two circuits equivalent, with a re-checkable receipt. |
| [**prereg-seal**](https://github.com/nickharris808/prereg-seal) | Seal acceptance criteria before you measure. |
| [**cert-atlas**](https://github.com/nickharris808/cert-atlas) | The 21 forgeries this verifier is scored against. |
| [📊 **The atlas dataset**](https://huggingface.co/datasets/nickh007/cert-atlas) | Browse the forgeries. |

### Where the free edition stops

This page **checks** a certificate. It does not **produce** one that is physically meaningful — that
needs sound enclosures over real process models, which is a separate commercial product.

Apache-2.0.

## What is in `examples/`

| bundle | what it shows |
|---|---|
| `admit` | a lithography gate certificate that admits |
| `reject_straddle` | one where a locus straddles the threshold, so neither answer is established |
| `forged` | a tampered bundle — the verdict does not re-derive |
| `thermal` | **not lithography.** A domain-agnostic `LCERT-BOUND-1` certificate: per-locus intervals for junction temperature, a threshold, and which side of it is safe. The same verifier re-derives it. |

Drop any of them on the page. Nothing is uploaded — the verification runs in your browser, and
the page makes no network requests after it loads.

Without the out-of-band fingerprint the answer is `UNVERIFIED`, which is an abstention rather than
a failure. That is deliberate: internal consistency cannot rule out a forgery in which the inputs
and the recorded verdict were edited together.
