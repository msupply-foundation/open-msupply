# Rewrite progress

Where each spec'd vertical has reached in the delivery pipeline
([`spec/PROCESS.md`](./spec/PROCESS.md)): **spec → cases → build → e2e → exploratory**.

This file answers "which steps has this vertical had?". It does **not** track which
navigation destinations exist — that is
[#340 Finish the Frontend Rewrite](https://github.com/msupply-foundation/open-msupply-internal/issues/340),
which carries the destination list, each vertical's epic and its PRs. Look there for
status and history; look here for pipeline coverage.

Every cell records whether the artifact is **present in this tree**, nothing more. A tick
is not a quality judgement, a review, or a guarantee the step is finished to the standard
its skill describes — read the vertical's `BUILD_REPORT.md` and its case file for that.

| Vertical | Spec | Cases | Build | e2e | Workflow | Run |
| --- | :-: | :-: | :-: | :-: | :-: | --- |
| [`campaigns`](./spec/campaigns/) | ✅ | ✅ | ✅ | — | — | — |
| [`clinicians`](./spec/clinicians/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`cold-chain-equipment`](./spec/cold-chain-equipment/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-09-11 |
| [`cold-chain-monitoring`](./spec/cold-chain-monitoring/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-09-08 |
| [`cold-chain-sensors`](./spec/cold-chain-sensors/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-09-11 |
| [`custom-fields`](./spec/custom-fields/) | ✅ | ✅ | ✅ | — | — | — |
| [`customer-returns`](./spec/customer-returns/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`dashboard`](./spec/dashboard/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`demographics`](./spec/demographics/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-09-15 |
| [`global-preferences`](./spec/global-preferences/) | ✅ | ✅ | ✅ | — | — | — |
| [`help`](./spec/help/) | ✅ | ✅ | ✅ | — | ✅ | — |
| [`immunisation-programs`](./spec/immunisation-programs/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-09-17 |
| [`inbound-shipments`](./spec/inbound-shipments/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`internal-orders`](./spec/internal-orders/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-08-10 · 2026-08-11 |
| [`items`](./spec/items/) | ✅ | ✅ | ✅ | — | ✅ | — |
| [`locations`](./spec/locations/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`master-lists`](./spec/master-lists/) | ✅ | ✅ | ✅ | — | ✅ | — |
| [`names`](./spec/names/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-07-25 |
| [`outbound-shipments`](./spec/outbound-shipments/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`patients`](./spec/patients/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`prescription-requests`](./spec/prescription-requests/) | ✅ | — | ✅ | — | — | — |
| [`prescriptions`](./spec/prescriptions/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`reports`](./spec/reports/) | ✅ | — | ✅ | ✅ | — | — |
| [`requisitions`](./spec/requisitions/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`rnr-forms`](./spec/rnr-forms/) | ✅ | ✅ | ✅ | — | ✅ | — |
| [`settings`](./spec/settings/) | ✅ | ✅ | ✅ | ✅ | ✅ | 2026-07-28 |
| [`sites`](./spec/sites/) | ✅ | ✅ | ✅ | — | — | — |
| [`stock`](./spec/stock/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`stock-movements`](./spec/stock-movements/) | ✅ | ✅ | ✅ | — | — | — |
| [`stocktakes`](./spec/stocktakes/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| [`supplier-returns`](./spec/supplier-returns/) | ✅ | ✅ | ✅ | — | ✅ | — |
| [`sync-modal`](./spec/sync-modal/) | ✅ | ✅ | ✅ | ✅ | ✅ | — |

Legend — ✅ present · — absent. **Run** gives the date of each exploratory run on file
under [`exploratory/reports/`](./exploratory/reports/).

## What each column means

| Column | Ticked when | Skill |
| --- | --- | --- |
| **Spec** | `spec/<vertical>/` exists — `README`, `rules`, `contract`, `ui-surface` | `/reverse-spec` |
| **Cases** | `spec/<vertical>/cases/` holds the behaviour-anchored case file(s) | `/reconcile-behaviours` |
| **Build** | `src/sections/<vertical>/` exists (a built vertical is also registered in `sectionRoutes`) | `/spec-build` |
| **e2e** | `e2e/specs/<vertical>-regression.spec.ts` exists | `/author-deterministic-tests` |
| **Workflow** | `exploratory/workflows/<vertical>.md` exists | `/run-exploratory` |
| **Run** | at least one report under `exploratory/reports/<date>/` | `/run-exploratory` |

## Not listed

Cross-cutting spec folders are not verticals and have no pipeline row of their own:
`ui-standards`, `navigation`, `i18n`, `keyboard`, `performance`, `plugins`, `chrome`,
`android`, `desktop`, `startup`, `sync-message`, `stock-allocation`. Several are
nonetheless covered by tests — the startup rules by four suites (`login`, `relogin`,
`initialisation`, `startup-failure`), `chrome` by its own suite and an exploratory run on
2026-07-29.

## Keeping it true

The table is derived from the tree, so it is only correct as of its last edit. A vertical
that finishes a step should tick its own cell **in the PR that delivers that step**, the
same way it adds its `spec/README.md` index line.
