# Troubleshooting — lcert-verify-web

## The verdict is `UNVERIFIED` and I dropped a valid bundle

Expected. Without the out-of-band fingerprint there is nothing to assert. Paste the anchor into the
field, or pass `expectedSha256` to `verifyBundle`.

This is an abstention, not a failure of the certificate.

## `manifest lists X, which was not supplied`

The manifest covers payload files and you dropped only `bundle.json`. Drop the whole directory —
the page reads every file you give it and hashes each against the manifest.

## The conformance suite fails after I changed `lcert.js`

That is the suite doing its job: this port must agree with the Python reference exactly.

Regenerate the fixtures first (`python3 test/gen_fixtures.py`) in case the *reference* changed.
If it did not, the divergence is in your change, and the failing check names which property.

## Float rendering differs from Python

`pyFloatRepr` reproduces CPython's shortest-round-trip float formatting, which is not what
JavaScript's `toString` produces for every value. If you are formatting floats for a canonical
form, use it rather than string interpolation.

## It will not run from `file://`

ES modules need an origin. `python3 -m http.server` in the repository root and open
`http://localhost:8000`.

---

*Still stuck? Open an issue with the browser, the console output, and the bundle if you can share it.*
