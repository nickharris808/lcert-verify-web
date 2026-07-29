# Contributing to lcert-verify-web

This package is part of [certified-oss][p]. **The portfolio-wide guide is
[CONTRIBUTING.md][c] and it is the one to read** — it covers the rules that are not negotiable,
how to install packages that depend on each other, and what kind of contribution is most wanted
(a forgery this project fails to catch).

What is specific to this package:

- **This port must agree with the Python reference exactly.** `python3 test/gen_fixtures.py` then
  `node test/conformance.mjs`. A change that makes the two disagree is a bug in one of them, and the
  failing check names which property.
- **The one deliberate difference is documented in the source** — the canonical round-trip check is
  omitted because JSON cannot distinguish an integer from an integral float. Do not add it; do not
  remove the comment explaining why.

## Working on it

```bash
pip install -e ".[test]"
pytest -q
ruff check .
```

## Licence

Apache-2.0. By contributing you agree your contribution is licensed the same way.

[p]: https://github.com/nickharris808/certified-oss
[c]: https://github.com/nickharris808/certified-oss/blob/main/CONTRIBUTING.md
