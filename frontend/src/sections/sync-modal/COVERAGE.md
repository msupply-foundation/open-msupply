# Sync-modal — acceptance coverage (C1 traceability)

Maps every `AC-*` in [`spec/sync-modal/acceptance.md`](../../../spec/sync-modal/acceptance.md)
to where it is verified. Behavioural derivations are unit-tested here (node
vitest, the repo's test culture); interaction / live-channel / a11y criteria are
realised by the substrate or checked against the running app (per
[`spec/IMPLEMENTING.md` → conformance contract](../../../spec/IMPLEMENTING.md#the-conformance-contract):
C4 semantics against the running implementation; C5 visual is human; C2's
real-backend exercise is the `e2e/` Playwright suite, not vitest).

| AC        | What it asserts                                  | Verified by                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AC-S1** | Status-line precedence                           | `syncStatus.test.ts` › _status-line precedence_ (`statusLineKind`)                                                                                                                                                                                                     |
| **AC-S2** | Phase list with progress (count where countable) | `syncStatus.test.ts` › _phase list with progress_ (`toSyncOverview`)                                                                                                                                                                                                   |
| **AC-S3** | Last-successful notice: time + exact h/m/s       | `syncStatus.test.ts` › _duration decomposition and units_ (`syncDurationParts` + `durationUnits`); time-of-day-vs-date is `SyncModal.tsx` (running app)                                                                                                                |
| **AC-S4** | Status stays current while open                  | Substrate live channel + poll discipline (`src/api/syncStore.ts`); modal's fetch-on-open-when-uncached + open-time fallback interval (`SyncModal.tsx`); pure-display proxy in `syncStatus.test.ts` › _display tracks the latest status_                                |
| **AC-S5** | Phase set matches generation × surface × role    | `syncStatus.test.ts` › _phase set matches the context_ (the full matrix)                                                                                                                                                                                               |
| **AC-S6** | Backfill "Special syncs" list                    | `syncStatus.test.ts` › _backfill "Special syncs" descriptions_ (`toSyncOverview` maps V7 `linkedDescriptions` by kind, empty for an ordinary run and on legacy); rendered as the disclosure in `SyncModal.tsx`                                                         |
| **AC-T1** | Trigger starts a run; busy until it ends         | `syncStatus.test.ts` › _Sync-now busy state machine_ (`advanceTriggerState`, keyed on the run-status signature incl. `summary.started`, so a handshake-stage error or identical retry still releases the button); wired in `SyncModal.tsx`, `triggerSync` is substrate |
| **AC-T2** | Trigger during a run is a no-op                  | Server-enforced (verified live in the spec); client cannot re-fire — the Sync-now button is `disabled`/`aria-busy` while `busy()` (`SyncModal.tsx` + the busy machine above)                                                                                           |
| **AC-T3** | No trigger before initialisation                 | Server-enforced (`manualSync` rejects pre-init — contract § Viewing and triggering); the modal is chrome-mounted only in an entered store, unreachable pre-init                                                                                                        |
| **AC-T4** | No permission required to view/trigger           | Server auth table (no permission on `latestSyncStatus`/`manualSync`); the modal gates nothing on permission except the server-admin Settings shortcut                                                                                                                  |
| **AC-Q2** | Records-to-push drains to zero on success        | `syncStatus.test.ts` › _records-to-push drains on success_ (`statusLineKind`); the count itself is the substrate subscription                                                                                                                                          |
| **AC-E1** | Failed run shows its kind's localised summary    | `syncErrors.test.ts` › _variant → kind mapping_ (exhaustive over both enums; distinct-per-kind; hints; unknown fallback)                                                                                                                                               |
| **AC-E2** | Failure preserves the last-successful record     | `syncStatus.test.ts` › _a failed run preserves the last-successful record_                                                                                                                                                                                             |
| **AC-E3** | Error clears on a later success                  | `syncStatus.test.ts` › _a later successful run clears the error (AC-E3)_ — the error is a pure derivation of the latest status, so a subsequent error-free run yields `error: undefined`                                                                               |
| **AC-R1** | App refresh without re-login                     | Realised by the substrate's run-completed hook (`src/api/syncStore.ts` → `onRunCompleted`); the vertical does not re-implement it (contract § After a run completes)                                                                                                   |

## Chrome sync indicator (spec/chrome § sync indicator)

The badge/dim derivation (`createSyncIndicator`) is a host-contract export. Its
pure model — alert-vs-count, the display-threshold gate, the 99+ cap, and the
staleness tones — is unit-tested in `syncStatus.test.ts` › _chrome indicator
badge_ (`syncIndicatorBadge`). The reactive wiring (the minutely tick, the slow
fallback poll while the live channel is down, the 99+/exact-count formatting) is
verified against the running app.
