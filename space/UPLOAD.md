# The Hugging Face Space, prepared but not uploaded

This directory is the exact content that should be live at
<https://huggingface.co/spaces/nickh007/cert-verifier>. It is here because **the upload was
refused and I could not resolve it.**

## What happened

Every write to the Space — the whole directory, and each file individually — returns:

```
HTTP 402
Static Spaces are free for everyone, but hosting Gradio and Docker Spaces on
free cpu-basic requires a PRO subscription.
```

The Space *is* static (`sdk: static`), so the message does not describe this Space. The account
has 12 static Spaces; the most likely cause is an account-level quota rather than anything about
this content. Uploads to the **dataset** on the same account and the same credentials succeeded
in the same session, so it is not authentication.

The Space is still live and still works — it is serving the previous version, which does not know
about the domain-agnostic `LCERT-BOUND-1` certificate kind.

## What is ready

- `src/lcert.js` — the current verifier, which re-derives `LCERT-BOUND-1` bit-identically to the
  Python reference (checked by 120 conformance assertions in this repository).
- `index.html` — renders interval-bound certificates alongside the lithography ones.
- `examples/thermal/` — a real bundle built by `lcert-build`, with nothing to do with
  lithography, verified through the browser code path before being placed here.
- `README.md` — the Space card, with the examples table.

## To publish it

From this directory, signed in as the account owner:

```bash
hf upload nickh007/cert-verifier . . --repo-type space
```

If the 402 persists, it is an account-tier matter rather than a content one — check the Spaces
quota at <https://huggingface.co/settings/billing>, or delete an unused Space.

Verified before packaging, through the same code path the browser runs:

```
unanchored : UNVERIFIED | certs 1 | loci 3
anchored   : VERIFIED   | errors 0
overstated : E_MARGIN_OVERSTATED caught
```
