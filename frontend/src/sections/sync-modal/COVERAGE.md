# Sync-modal — behaviour coverage (C1 traceability)

Maps every modal-owned behaviour of
[`spec/sync-modal/cases/OMS-REG-SYNC-03`](../../../spec/sync-modal/cases/OMS-REG-SYNC-03%20-%20Validate%20Synchronisation%20UI%20and%20Version%20Updates.md)
(IDs below are `OMS-REG-SYNC-03.*`; the retired `AC-*` → behaviour mapping is
[`spec/sync-modal/acceptance.md`](../../../spec/sync-modal/acceptance.md))
to where it is verified. Behavioural derivations are unit-tested here (node
vitest, the repo's test culture); interaction / live-channel / a11y criteria are
realised by the substrate or checked against the running app (per
[`spec/IMPLEMENTING.md` → conformance contract](../../../spec/IMPLEMENTING.md#the-conformance-contract):
C4 semantics against the running implementation; C5 visual is human; C2's
real-backend exercise is the `e2e/` Playwright suite, not vitest).

| Behaviour         | What it asserts                                                               | Verified by                                                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **.18**           | Status-line precedence                                                        | `syncStatus.test.ts` › _status-line precedence_ (`statusLineKind`)                                                                                                                                                                                                     |
| **.19** / **.20** | Phase list with progress (count where countable); idle keeps completed phases | `syncStatus.test.ts` › _phase list with progress_ (`toSyncOverview`)                                                                                                                                                                                                   |
| **.21** / **.7**  | Last-successful notice: idle-only, time + exact h/m/s                         | `syncStatus.test.ts` › _duration decomposition and units_ (`syncDurationParts` + `durationUnits`); time-of-day-vs-date is `SyncModal.tsx` (running app)                                                                                                                |
| **.22**           | Status stays current while open                                               | Substrate live channel + poll discipline (`src/api/syncStore.ts`); modal's fetch-on-open-when-uncached + open-time fallback interval (`SyncModal.tsx`); pure-display proxy in `syncStatus.test.ts` › _display tracks the latest status_                                |
| **.23**           | Phase set matches generation × surface × role                                 | `syncStatus.test.ts` › _phase set matches the context_ (the full matrix)                                                                                                                                                                                               |
| **.24**           | Backfill "Special syncs" list                                                 | `syncStatus.test.ts` › _backfill "Special syncs" descriptions_ (`toSyncOverview` maps V7 `linkedDescriptions` by kind, empty for an ordinary run and on legacy); rendered as the disclosure in `SyncModal.tsx`                                                         |
| **.25**           | Trigger starts a run; busy until it ends                                      | `syncStatus.test.ts` › _Sync-now busy state machine_ (`advanceTriggerState`, keyed on the run-status signature incl. `summary.started`, so a handshake-stage error or identical retry still releases the button); wired in `SyncModal.tsx`, `triggerSync` is substrate |
| **.26**           | Trigger during a run is a no-op                                               | Server-enforced (verified live in the spec); client cannot re-fire — the Sync-now button is `disabled`/`aria-busy` while `busy()` (`SyncModal.tsx` + the busy machine above)                                                                                           |
| **.27**           | No permission required to view/trigger                                        | Server auth table (no permission on `latestSyncStatus`/`manualSync`); the modal gates nothing on permission except the server-admin Settings shortcut                                                                                                                  |
| **.6**            | Records-to-push drains to zero on success (live)                              | `syncStatus.test.ts` › _records-to-push drains on success_ (`statusLineKind`); the count itself is the substrate subscription                                                                                                                                          |
| **.28**           | Failed run shows its kind's localised summary                                 | `syncErrors.test.ts` › _variant → kind mapping_ (exhaustive over both enums; distinct-per-kind; hints; unknown fallback)                                                                                                                                               |
| **.29**           | Failure preserves the last-successful record                                  | `syncStatus.test.ts` › _a failed run preserves the last-successful record_                                                                                                                                                                                             |
| **.30**           | Error clears on a later success                                               | `syncStatus.test.ts` › _a later successful run clears the error_ — the error is a pure derivation of the latest status, so a subsequent error-free run yields `error: undefined`                                                                                       |
| **.31**           | App refresh without re-login                                                  | Realised by the substrate's run-completed hook (`src/api/syncStore.ts` → `onRunCompleted`); the vertical does not re-implement it (contract § After a run completes)                                                                                                   |

Not behaviour-anchored (rules/contract-owned, per the
[mapping](../../../spec/sync-modal/acceptance.md)): the pre-initialisation
trigger rejection (was AC-T3) is server-enforced (`manualSync` rejects
pre-init — contract § Viewing and triggering); the modal is chrome-mounted
only in an entered store, unreachable pre-init.

## Chrome sync indicator (spec/chrome § sync indicator)

The badge/dim derivation (`createSyncIndicator`) is a host-contract export. Its
pure model — alert-vs-count, the display-threshold gate, the 99+ cap, and the
staleness tones — is unit-tested in `syncStatus.test.ts` › _chrome indicator
badge_ (`syncIndicatorBadge`). The reactive wiring (the minutely tick, the slow
fallback poll while the live channel is down, the 99+/exact-count formatting) is
verified against the running app.
