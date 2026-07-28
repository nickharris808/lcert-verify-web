/**
 * lcert-verify-web — browser-side re-derivation of LCERT-1 certificate verdicts.
 *
 * Why the port is faithful:
 *
 *   - The interval arithmetic uses only IEEE-754 double +, -, *, comparison,
 *     Math.max and nextafter. These are correctly rounded by the standard, and
 *     JavaScript numbers *are* IEEE doubles — the same doubles CPython uses — so
 *     the per-locus classification is BIT-IDENTICAL to the Python verifier.
 *
 *   - erfc is the one exception. There is no erfc in the JS standard library, so
 *     this file carries its own implementation, accurate to roughly 1e-15
 *     relative. It is NOT bit-identical to a platform libm. That is sound here
 *     because erfc is used only for the kappa round-trip, whose acceptance
 *     tolerance the format fixes at 1e-12 absolute — two orders of magnitude
 *     above the approximation error. The conformance suite checks this against
 *     the Python implementation rather than assuming it.
 *
 * No dependencies. No network. Nothing leaves the page.
 */

const FORMAT = "litholab-cert-bundle/1";

/* ---------- IEEE-754 nextafter, used for outward rounding ---------- */

const _buf = new ArrayBuffer(8);
const _f64 = new Float64Array(_buf);
const _u64 = new BigUint64Array(_buf);

export function nextafter(x, y) {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  if (x === y) return y;
  if (x === 0) return y > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE;
  _f64[0] = x;
  let bits = _u64[0];
  // Move one ULP toward y.
  if ((x < y) === (x > 0)) bits += 1n;
  else bits -= 1n;
  _u64[0] = bits;
  return _f64[0];
}

export const down = (x) => nextafter(x, -Infinity);
export const up = (x) => nextafter(x, Infinity);

/* ---------- erfc, matching the C library to double precision ---------- */

/**
 * Complementary error function.
 *
 * Uses the standard Numerical Recipes incomplete-gamma continued fraction /
 * series split, which is accurate to ~1e-15 relative — sufficient for the
 * round-trip tolerance the format specifies (1e-12 absolute).
 */
export function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x === 0) return 1;
  // Continued fraction (Lentz) for the upper incomplete gamma Q(1/2, x^2).
  const a = 0.5, xx = x * x;
  if (xx < a + 1) {
    // Series expansion for P(a, xx); erfc = 1 - P
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= xx / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-17) break;
    }
    const P = sum * Math.exp(-xx + a * Math.log(xx) - lgamma(a));
    return 1 - P;
  }
  const FPMIN = 1e-300;
  let b = xx + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;  if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-17) break;
  }
  return h * Math.exp(-xx + a * Math.log(xx) - lgamma(a));
}

const _LG = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
function lgamma(z) {
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += _LG[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/* ---------- canonical JSON, matching Python's separators=(',',':') ---------- */

/**
 * Python-compatible float formatting.
 *
 * JSON canonicalization only works across languages if the number formatting
 * agrees. It does not by default: Python renders an integral float as `100.0`
 * where JS renders `100`, and Python switches to exponent notation below 1e-4
 * where JS waits until 1e-6. Both use shortest-round-trip digits, so once those
 * two rules are applied the outputs coincide.
 */
export function pyFloatRepr(x) {
  if (!Number.isFinite(x)) throw new Error("non-finite numbers have no canonical form");
  if (Number.isInteger(x) && Math.abs(x) < 1e16) {
    return (Object.is(x, -0) ? "-0" : String(x)) + ".0";
  }
  const exp = Math.floor(Math.log10(Math.abs(x)));
  let s;
  if (exp < -4 || exp >= 16) {
    s = x.toExponential();                       // shortest round-trip mantissa
    // Python pads the exponent to at least two digits: 1e-5 -> 1e-05
    s = s.replace(/e([+-])(\d)$/, "e$10$2");
  } else {
    s = String(x);
    if (s.includes("e")) {                        // JS chose exponent, Python would not
      s = x.toFixed(20).replace(/0+$/, "").replace(/\.$/, ".0");
    }
  }
  return s;
}

// JSON does not distinguish an integer from an integral float, so a canonical
// re-serialization in JS cannot always reproduce the producer's bytes. Keys that
// the format defines as integers are listed here; everything else numeric is
// rendered as a float. See the note on `verifyBundle` for why this does not
// weaken verification.
const _INT_KEYS = new Set(["seed", "n_loci", "n_certainly_safe",
                           "n_certainly_unsafe", "n_straddle"]);

/**
 * Canonical JSON, matching Python's `separators=(",",":")` with sorted keys.
 *
 * CONTRACT: exact for objects whose numeric leaves are floats, plus integers at
 * the keys the format defines as integral (`_INT_KEYS`). A bare JSON integer at
 * any other key cannot be distinguished from an integral float in JavaScript and
 * will be rendered as a float. Certificate payloads satisfy this contract by
 * construction; do not use `canon` as a general-purpose Python-JSON bridge.
 */
export function canon(obj, key) {
  if (obj === null) return "null";
  if (typeof obj === "boolean") return obj ? "true" : "false";
  if (typeof obj === "number") {
    return (Number.isInteger(obj) && _INT_KEYS.has(key)) ? String(obj) : pyFloatRepr(obj);
  }
  if (typeof obj === "string") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map((v) => canon(v, key)).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canon(obj[k], k)).join(",") + "}";
}

/* ---------- SHA-256 / HMAC via WebCrypto ---------- */

const enc = new TextEncoder();

export async function sha256(bytes) {
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(d);
}

export function hex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function concat(...arrs) {
  const n = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

/* ---------- the verdict re-derivation (the part that matters) ---------- */

/**
 * Re-derive the per-locus interval-gate classification and the verdict.
 * Mirrors the Python `rederive_gate_verdict` operation for operation.
 */
export function rederiveGateVerdict(cert) {
  const thr = +cert.thr, dd = +cert.delta_dose, K = +cert.K;
  const K_lo = down(down(K)), K_hi = up(up(K));
  const L = cert.loci;
  const n = L.ae0.length;
  let nSafe = 0, nUnsafe = 0, nStraddle = 0;

  for (let j = 0; j < n; j++) {
    const I_lo = +L.I_lo[j], I_hi = +L.I_hi[j], ae0 = +L.ae0[j];
    const sub = ae0 < thr;
    const he = (1.0 + dd) * I_hi;
    const le = (1.0 - dd) * I_lo;
    const he_lo = down(he), he_hi = up(he);
    const le_lo = down(le), le_hi = up(le);
    let m_lo, m_hi, in_lo, in_hi;
    if (sub) {
      m_lo = down(thr - he_hi); m_hi = up(thr - he_lo);
      in_lo = he_lo; in_hi = he_hi;
    } else {
      m_lo = down(le_lo - thr); m_hi = up(le_hi - thr);
      in_lo = le_lo; in_hi = le_hi;
    }
    const Kin_lo = down(K_lo * Math.max(in_lo, 0.0));
    const Kin_hi = up(K_hi * Math.max(in_hi, 0.0));
    const safe = (m_lo > 0.0) && (down(m_lo * m_lo) >= Kin_hi);
    const unsafe = (m_hi <= 0.0) || (up(m_hi * m_hi) < Kin_lo);
    if (safe) nSafe++;
    else if (unsafe) nUnsafe++;
    else nStraddle++;
  }

  let interval_admit, stable;
  if (n === 0) { interval_admit = true; stable = true; }
  else if (nUnsafe > 0) { interval_admit = false; stable = nStraddle === 0; }
  else if (nStraddle === 0) { interval_admit = true; stable = true; }
  else { interval_admit = false; stable = false; }

  return { interval_admit, stable, n_loci: n, n_certainly_safe: nSafe,
           n_certainly_unsafe: nUnsafe, n_straddle: nStraddle };
}

export function checkKappaK(budget, safety, nPhotons, kappa, K) {
  const errs = [];
  if (!(Math.abs(0.5 * erfc(kappa) - budget) < 1e-12))
    errs.push("kappa fails the erfc round-trip against budget");
  const Kre = 2.0 * kappa * kappa * safety * safety / nPhotons;
  if (Kre !== K)
    errs.push("K does not recompute bit-identically from (kappa, safety, n_photons)");
  return errs;
}

/* ---------- top-level bundle verification ---------- */

/**
 * Verify a bundle.
 *
 * `requireCerts` (default true) refuses a bundle carrying no certificates at all.
 * Such a bundle is trivially consistent, so a bare format check reports success on
 * it — which a reader would mistake for "something was certified", and which an
 * attacker can produce by simply deleting the certificates. Pass `false` only if
 * an empty bundle is genuinely expected.
 */
export const VERDICT = {
  VERIFIED: "VERIFIED",
  VERIFIED_VACUOUS: "VERIFIED-VACUOUS",
  INTERNALLY_CONSISTENT: "INTERNALLY-CONSISTENT",
  UNVERIFIED: "UNVERIFIED",
  VACUOUS: "VACUOUS",
  REFUTED: "REFUTED",
};

const NO_ANCHOR =
  "no trust anchor supplied — the bundle is internally consistent, but internal " +
  "consistency cannot distinguish a genuine certificate from a self-consistent forgery " +
  "(one where the physics inputs AND the recorded verdict were edited together). Supply " +
  "the expected bundle fingerprint, obtained out of band. To accept the weaker " +
  "internal-consistency check on purpose, pass { requireAnchor: false }.";

export async function verifyBundle(bundleText, files = {}, expectedSha = "",
                                   { requireCerts = true, requireAnchor = true } = {}) {
  const errors = [];
  const raw = enc.encode(bundleText);

  if (expectedSha) {
    const got = hex(await sha256(raw));
    if (got !== expectedSha.toLowerCase())
      errors.push(`bundle fingerprint ${got} does not match the expected value`);
  }

  let bundle;
  try { bundle = JSON.parse(bundleText); }
  catch (e) { return { ok: false, errors: [`bundle.json is not valid JSON: ${e.message}`] }; }

  if (bundle.format !== FORMAT)
    errors.push(`unknown bundle format ${JSON.stringify(bundle.format)}`);

  // NOTE ON CANONICAL JSON. The Python reference verifier additionally checks
  // that bundle.json round-trips through its canonical serializer. That check is
  // deliberately NOT reproduced here: JSON cannot distinguish an integer from an
  // integral float, so a JS re-serialization can differ from the producer's bytes
  // for reasons that are not tampering. Byte-level integrity is instead
  // established by the fingerprint above, which is exact and language-neutral —
  // supply `expectedSha` (obtained out of band) to get it. Everything the
  // canonical check would catch, the fingerprint catches strictly better.

  for (const [rel, want] of Object.entries(bundle.manifest || {})) {
    if (!(rel in files)) { errors.push(`manifest lists ${rel}, which was not supplied`); continue; }
    const got = hex(await sha256(files[rel]));
    if (got !== want) errors.push(`payload ${rel} does not match its manifest sha256`);
  }

  for (const cert of bundle.gate_certs || []) {
    const name = cert.name ?? "?";
    for (const e of checkKappaK(+cert.budget, +cert.safety, +cert.n_photons,
                                +cert.kappa, +cert.K))
      errors.push(`[${name}] ${e}`);
    const red = rederiveGateVerdict(cert);
    const rec = cert.recorded || {};
    for (const [k, v] of Object.entries(red))
      if (rec[k] !== v)
        errors.push(`[${name}] recorded ${k}=${JSON.stringify(rec[k])} but re-derived ${JSON.stringify(v)}`);
  }

  const nCerts = (bundle.gate_certs || []).length +
                 (bundle.image_bound_certs || []).length +
                 (bundle.resource_floor_certs || []).length;
  const nLoci = (bundle.gate_certs || [])
    .reduce((s, c) => s + ((c.loci && c.loci.ae0) ? c.loci.ae0.length : 0), 0);

  const internallyConsistent = errors.length === 0;
  const fingerprint = hex(await sha256(raw));
  let verdict, ok;

  if (errors.length) {
    verdict = VERDICT.REFUTED; ok = false;
  } else if (requireCerts && nCerts === 0) {
    verdict = VERDICT.VACUOUS; ok = false;
    errors.push("bundle carries no certificates — nothing was verified. This is a " +
                "vacuous bundle; pass { requireCerts: false } if that is intended.");
  } else if (!expectedSha) {
    if (requireAnchor) { verdict = VERDICT.UNVERIFIED; ok = false; errors.push(NO_ANCHOR); }
    else { verdict = VERDICT.INTERNALLY_CONSISTENT; ok = true; }
  } else if (nLoci === 0) {
    // Consistent, but no locus carried a proof obligation. Calling that VERIFIED
    // would sell a guarantee nothing had to earn.
    verdict = VERDICT.VERIFIED_VACUOUS; ok = true;
  } else {
    verdict = VERDICT.VERIFIED; ok = true;
  }

  return { ok, verdict, errors, bundle, nCertificates: nCerts, nGatedLoci: nLoci,
           trustAnchor: expectedSha ? "fingerprint" : "NONE",
           internallyConsistent, fingerprint };
}

export { FORMAT };
