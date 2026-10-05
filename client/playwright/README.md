# Playwright E2E Tests (React front end — run on demand)

- **Docs site**: https://dev-docs.msupply.foundation/client/playwright/
- **Source**: [docs/content/client/playwright/_index.md](../../docs/content/client/playwright/_index.md)

> **Run on demand, not maintained.** The deterministic e2e suites live in
> [`frontend/e2e/`](../../frontend/e2e/README.md) and target the Solid front end
> (`frontend/`) — run them there with `cd frontend && pnpm e2e:local <suite>`.
> The hermetic runner here drives those same suites against the React front
> end (`client/`) instead. It is kept for the occasional check against the
> React front end, but is not run routinely: expect suites that assert
> Solid-only behaviour to fail, and don't extend the specs in this directory.

## Hermetic run against the React front end

One command builds the (sqlite) server, restores a throwaway database from the
committed reference datafile ([server/data/e2e](../../server/data/e2e/README.md)),
boots the server + the React front end on dedicated ports, runs the suites
from `frontend/e2e/`, and tears everything down:

```bash
cd client
npx playwright install chromium                # first time only
yarn e2e:local stocktake-regression            # one suite
yarn e2e:local stocktake-regression --headed   # watch it
KEEP_SERVER=1 yarn e2e:local stocktake-regression   # leave the stack up to poke at
```

`FE_SUITES_DIR` overrides where the suites are read from (default: this repo's
`frontend/`).

## Still used: the e2e datafile generator

[`scripts/build-e2e-export.py`](scripts/build-e2e-export.py) generates the e2e
reference datafile in [`server/data/e2e`](../../server/data/e2e/README.md)
that the `frontend/e2e` suites restore from — see that README's regeneration
recipe.
