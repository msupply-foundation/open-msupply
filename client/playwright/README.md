# Playwright E2E Tests (not maintained)

- **Docs site**: https://dev-docs.msupply.foundation/client/playwright/
- **Source**: [docs/content/client/playwright/_index.md](../../docs/content/client/playwright/_index.md)

> **Not maintained.** The Playwright tests and hermetic runner in this
> directory target the legacy client and are no longer kept working — don't
> extend them or rely on them. The deterministic e2e suites live in
> [`frontend/e2e/`](../../frontend/e2e/README.md) and target the new front end;
> see that README for how to run them (`cd frontend && pnpm e2e:local <suite>`).

One file here is still used:
[`scripts/build-e2e-export.py`](scripts/build-e2e-export.py) generates the e2e
reference datafile in [`server/data/e2e`](../../server/data/e2e/README.md)
that the `frontend/e2e` suites restore from — see that README's regeneration
recipe.
