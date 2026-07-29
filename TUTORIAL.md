# Tutorial — lcert-verify-web

The same verifier, in a browser. Nothing is uploaded.

## Use it without installing anything

Open the [hosted verifier](https://huggingface.co/spaces/nickh007/cert-verifier) and drop a bundle
directory on the page. Verification runs in your browser; the page makes no network requests after
it loads.

## Use it as a module

```html
<script type="module">
  import { verifyBundle } from "./src/lcert.js";

  const res = await verifyBundle(bundleText, files, expectedSha256);
  console.log(res.verdict);        // VERIFIED | UNVERIFIED | REFUTED | …
</script>
```

`files` maps each manifest path to its bytes. `expectedSha256` is the out-of-band anchor; **leave
it out and the result is `UNVERIFIED`** — an abstention, not a failure.

## Why bit-identity matters, and how it is checked

Two implementations of the same check are only useful if they agree. A conformance suite generates
fixtures from the Python reference and asserts this port reproduces them — **120 checks**,
including IEEE-754 agreement on `erfc` (worst absolute error 3.6e-14), canonical-form rendering of
floats, and the domain-agnostic `LCERT-BOUND-1` re-derivation on cases that include a locus
exactly on the threshold and one a single ULP inside it.

```bash
python3 test/gen_fixtures.py   # from the Python reference
node test/conformance.mjs      # 120 passed, 0 failed
```

## The one deliberate difference

The Python verifier also checks that `bundle.json` round-trips through its canonical serializer.
This port does **not**, and says so in the source: JSON cannot distinguish an integer from an
integral float, so a JS re-serialisation can differ from the producer's bytes for reasons that are
not tampering.

Byte-level integrity is instead established by the fingerprint, which is exact and
language-neutral — strictly stronger than the canonical check. Supply `expectedSha256` to get it.

---

*See [certified-oss](https://github.com/nickharris808/certified-oss) for why any of this exists.*
