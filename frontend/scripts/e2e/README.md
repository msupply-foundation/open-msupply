# Deterministic e2e (regression suites from open-msupply)

The deterministic regression suites live in
[open-msupply](https://github.com/msupply-foundation/open-msupply) under
`client/playwright` (see PR
[#11863](https://github.com/msupply-foundation/open-msupply/pull/11863)).
They locate every interaction point by a `data-testid` documented in
`client/playwright/TESTIDS.md` there — the cross-front-end contract — so
the same suites verify this rewrite against the current app's behaviour.
This directory wires those suites to run against **this** front end.

## Run locally

```sh
# once: a checkout of open-msupply on the e2e-fe-auth branch
git clone https://github.com/msupply-foundation/open-msupply ../open-msupply --branch e2e-fe-auth

scripts/e2e/run-e2e.sh stocktake-regression
```

The script builds the (sqlite) server + CLI from that checkout, restores a
throwaway database from the committed reference datafile
(`server/data/e2e`), boots the server and this repo's vite dev server
(GraphQL proxied to the throwaway backend), runs the suites with
`BASE_URL` pointing at this front end, and tears everything down.
Identical data every run; no postgres, no central server, no setup.

Knobs: `OMS_DIR` (checkout location if not `../open-msupply`),
`E2E_SERVER_PORT` / `E2E_FE_PORT` (defaults 9930/3115 — chosen not to
collide with a `yarn e2e:local` run inside open-msupply itself), and
`KEEP_SERVER=1` to leave the stack up for debugging. Reports and stack
logs land in `<OMS_DIR>/client/playwright/{playwright-report,test-results}`.

## The backend ref: `e2e-fe-auth`

This front end logs in with the cookie-session auth contract
(open-msupply branch `fe-auth-contract`), while the e2e datafile, CLI
support and suites live on `distribution-regresstion-test` (PR #11863).
`e2e-fe-auth` is those two merged. When either lands in `develop`,
re-merge (or repoint) and update `BACKEND_REF` in
[.github/workflows/e2e-regression.yaml](../../.github/workflows/e2e-regression.yaml)
plus the branch name in `run-e2e.sh`.

## CI

[e2e-regression.yaml](../../.github/workflows/e2e-regression.yaml) runs
the stocktake suite on every PR via this same script — **non-blocking**:
until the `data-testid` contract is implemented here, the run is a
coverage signal (how much of the contract this FE satisfies), not a gate.
The Playwright HTML report and `results.json` (which carries each test's
`covers` behaviour annotations) are uploaded as artifacts on every run.
