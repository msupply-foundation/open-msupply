+++
title = "Playwright E2E Tests"
weight = 10
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "code"
+++

# Playwright E2E Tests (not maintained)

The Playwright tests and hermetic runner under `client/playwright/` target the
legacy client and are **no longer maintained** — don't extend them or rely on
them. The deterministic e2e suites live in `frontend/e2e/` and target the new
front end; see `frontend/e2e/README.md` in the repository for how to run them
(`cd frontend && pnpm e2e:local <suite>`).

One file there is still used: `client/playwright/scripts/build-e2e-export.py`
generates the e2e reference datafile in `server/data/e2e`, which the
`frontend/e2e` suites restore from — see `server/data/e2e/README.md` for the
regeneration recipe.
