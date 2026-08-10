# Sync message — build report

Built from [`spec/sync-message/`](../../../spec/sync-message/) by `/spec-build sync-message`, stacked on the spec branch `spec/sync-message`.

**Target stack:** SolidJS + Vite, composing the shared component library in [`src/ui/`](../../ui/), every slot resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md). Pattern source: the reference vertical `src/sections/stocktakes/` (list screen + modal-over-list shape taken from it and from `locations`, the closest existing "list with no detail route" vertical).

## What was built

| Surface                      | File                                                                      |
| ---------------------------- | ------------------------------------------------------------------------- |
| S1 register                  | `list/SyncMessagesList.tsx` (+ `listState.ts`, `listFilters.tsx`)         |
| S2 create-message modal      | `list/CreateSyncMessageModal.tsx` (+ `syncMessageCreate.ts`)              |
| S3 message modal             | `list/SyncMessageModal.tsx` (+ `messageFiles.ts`)                         |
| Store lookup (registry role) | `list/StoreSearch.tsx` — `AsyncCombobox` configured, per the registry row |
| Wire surface                 | `list/syncMessages.graphql` → `syncMessages.generated.ts`                 |
| Reach gate                   | `reach.ts`, applied by `index.tsx`'s route guard                          |
| Labels                       | `list/syncMessageLabels.ts`                                               |

Shared wiring (additive only): the route entry `'manage/sync-message': syncMessageRoutes` in `src/App.tsx`, and one new locale key in `src/intl/locales/en/common.json` (below). The nav destination already existed in `src/nav/navConfig.ts` (`manage/sync-message`, `centralAdmin` gate) — untouched.

## Gates

| Gate         | Result                                                        |
| ------------ | ------------------------------------------------------------- |
| `pnpm check` | ✅ green                                                      |
| `pnpm test`  | ✅ green — 148 files / 1470 tests, 65 of them this vertical's |
| `pnpm build` | ✅ green                                                      |

`pnpm codegen` was run against `http://localhost:8890/graphql` (the central probe server; `:8000` was down). It rewrote all 109 generated files and produced **zero** diff outside this vertical — the live schema still matches every other vertical's pinned output, which also re-confirms C7 for the sync-message types.

## Anchor coverage — `spec/sync-message/cases/OMS-REG-MNG-04`

| Behaviour         | Covered by                                                    | Notes                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.1`              | `reach.test.ts`                                               | central server AND server admin, both directions                                                                                                                             |
| `.2`              | `list/listState.test.ts`                                      | `storeId` is authorisation only; no store predicate is added                                                                                                                 |
| `.3`              | `list/listState.test.ts`                                      | default sort = created desc; the six columns are the register view's (visual, see gaps)                                                                                      |
| `.4`              | `list/syncMessageLabels.test.ts`                              | all four statuses + all three kinds → locale keys; unknown → `messages.not-applicable`                                                                                       |
| `.5`              | `list/listState.test.ts`                                      | `SORT_KEYS` = created + status only, both directions on the wire                                                                                                             |
| `.6`              | `list/listState.test.ts`                                      | Status seeded empty, narrows on pick, and no kind / created-date key can reach the wire                                                                                      |
| `.7`              | `list/listState.test.ts`                                      | offset/first always sent; state is URL-backed via `useUrlQueryState`                                                                                                         |
| `.8`              | — (see exemptions)                                            | empty-state copy + "no action inside it" is a render fact                                                                                                                    |
| `.9`              | `list/syncMessageCreate.test.ts`                              | one authorable kind, preselected; artefacts unticked                                                                                                                         |
| `.10`             | `list/syncMessageCreate.test.ts`                              | code-or-name search, no exclusion, no empty `like`                                                                                                                           |
| `.11`             | `list/syncMessageCreate.test.ts`                              | body derived from the ticks, and identical to what the insert sends                                                                                                          |
| `.12`             | `list/syncMessageCreate.test.ts`                              | the insert carries id/destination/body/kind and nothing else                                                                                                                 |
| `.13`             | `list/syncMessageCreate.test.ts`                              | `toStoreId` omitted entirely, never sent as null                                                                                                                             |
| `.14`             | `list/syncMessageCreate.test.ts`                              | any picked store is sent, the active one included                                                                                                                            |
| `.15`             | `list/syncMessageCreate.test.ts`                              | `createOutcome` — every non-success is a rejection that created nothing                                                                                                      |
| `.16` `.17` `.18` | `list/operations.test.ts`                                     | what this app owns: the create sends no status and no operation can write one. The observable "stays New until the receiving site syncs" is the processor's — a C2 gap below |
| `.19`             | `list/messageFiles.test.ts`                                   | file-name ordering, non-mutating                                                                                                                                             |
| `.20`             | `list/messageFiles.test.ts`                                   | no artefacts → no Files section; a kind that produces none never shows one                                                                                                   |
| `.21`             | `list/messageFiles.test.ts`                                   | raw reason shown only on an errored message with a reason                                                                                                                    |
| `.22`             | `list/syncMessageLabels.test.ts`, `list/messageFiles.test.ts` | five transfer states → keys; the sync-file URL the link opens                                                                                                                |
| `.23`             | `list/messageFiles.test.ts`                                   | the file's own reason, message still Processed, list still shown                                                                                                             |
| `.24`             | `list/messageFiles.test.ts`                                   | refused snapshot = errored message naming the restriction, no files                                                                                                          |
| `.25` `.26` `.27` | `list/operations.test.ts`                                     | enforced at the wire surface: one mutation (the insert), no update/delete/retry/re-send anywhere                                                                             |
| `.28`             | `list/listState.test.ts`                                      | exactly one sort key sent (the resolver takes the last), and no lifecycle sequence exists here to present                                                                    |
| `.29`             | `list/listState.test.ts`                                      | `pageFromResult` — a failed read yields no page, which is what raises the stale notice                                                                                       |

**C1 exemptions (listed, not dropped):**

- **`.8`** — the empty state's copy (`error.no-sync-messages`) and its lack of an action are render facts of `SyncMessagesList`, which renders no `empty` slot. There is no colocated way to assert them without rendering the screen (see the vitest limitation below); the register was live-driven instead, and this is e2e territory once a suite exists.
- **`.3`'s column inventory** — the default sort is unit-tested; that the six named columns render, in that order, is the same kind of render fact. Live-verified (below).
- Nothing is marked `(pending: …)`, `manual-only` or hardware-gated in the case, so no other exemption applies.

## Live verification (C2/C4, against the real backend)

Driven through the real screen on a dev server bound to the central probe server (`:8890`), store _Tamaki Central Medical Store_, signed in as a server admin. Confirmed on screen: the register with the six columns in order, newest-first, listing messages of stores other than the active one and one with no destination (`.2`, `.3`); Status and Type as resolved names (`.4`); the Status filter narrowing to Processed and to Error, and a status sort surviving the URL (`.5`, `.6`, `.7`); the create modal with Type preset and the derived body rewriting live as Logs was ticked and unticked (`.9`, `.11`); the destination picker searching "tam" and offering the **active store** itself (`.10`, `.14`); a save landing the new message at the top as From = the active store, Status New, no error (`.12`); that message reaching **Processed with no Files section** after the site's own sync (`.16`, `.20`); the eleven harvested log files of an earlier processed message listed in file-name order with their transfer badges and working `/sync_files/sync_message/<id>/<fileId>` links (`.19`, `.22`); and the error banner carrying the raw reason verbatim on an errored message (`.21`). No console errors.

**C2 real-backend gaps** — anchors that no automated test in this repo exercises against the backend, because the outcome is the receiving site's processor rather than a request this app makes:

- `.16` `.17` `.18` (a message staying New until — and unless — the destination store's site syncs; the cross-site and no-destination cases). Observed on screen as data, not driven.
- `.23` (a per-artefact failure with the message still Processed) and the later attached-file transfer states — the spec itself carries these as source-verified only; every file on the probe server sits at `NEW`.
- `.24`'s success twin — a database snapshot actually being taken needs a SQLite site; only the refusal path exists on this Postgres probe server (spec README gap, unchanged).

## Divergences honoured

- **D97** — the register offers **Status only**. No kind filter (the server has no `type` filter field and sending one fails the whole query at validation) and no created-date range (declared but never mapped). Both are dismissed explicitly in `list/listFilters.tsx` with the reason. D97's second half is implemented as the stale-read notice: a failed read keeps the previous page **and** says the list did not refresh.
- **D67** — every never-editable field is a `LabelledValue`, never a disabled input: the derived Body preview in S2 and every field of S3.
- **D22 / D21** — a rejected create keeps the modal open with the draft intact and states the failure inline; a successful one closes, closure being the confirmation.
- **D94 / navigation** — the reach gate is a _capability_-class gate (hide, don't refuse), matching `navConfig`'s `centralAdmin`; the route guard redirects rather than exposing the screen.

## New locale key

One key was needed for copy the spec names without citing a key (`ui-surface.md` S4 — "a failed register read … MUST also state that the list did not refresh"). Nothing in `en/common.json` matched that text under any role prefix, so:

- `error.list-not-refreshed` — "This list could not be refreshed — the rows shown are the last ones loaded, not the result of the current filter."

Added to `src/intl/locales/en/` only. Every other string in the vertical uses the key `ui-surface.md` cites, verbatim; all 34 of them already existed with the expected text.

## Roles: all built

Every role the surface names resolved to a ✅ or 🔶 registry row — nothing improvised, no ⛔ role reached. The **Store lookup** row is the one added with this spec: it is 🔶 "by configuration", and `list/StoreSearch.tsx` is that configuration (an `AsyncCombobox` fed the `stores` read, code above name, ordered by name, excluding nothing). It lives inside the vertical because it has exactly one consumer; **promote it to `src/domain/store/` the moment a second vertical needs a destination-store picker** — the shape is already the same as `src/domain/name/NameSearch.tsx`.

## Candidate spec refinements

1. **The body preview's form is unspecified.** `ui-surface.md` S2 calls the Body "a derived, read-only preview restating the ticked artefacts", but the recorded body is JSON (`{"logs":true,"database":false}`) and that is what both the current app and this build show. If a human-readable restatement ("Logs") was ever intended, the spec should say so — and say what is then recorded.
2. **S3 does not say where the files come from.** This build reads the attached files with the by-id `syncMessage` query when the modal opens, and takes every other field from the clicked row, so the register's own page stays light. The spec names both reads but not the split; worth stating, since it is the difference between one heavy list query and one small read per inspection.
3. **`.8`'s empty state and `.3`'s column inventory are render-only anchors.** They are perfectly good behaviours, but nothing in the colocated-test layer can assert them. They should be explicitly assigned to the `e2e/` suite when one is written (C1 permits it — the case just needs to name the owner).

## Follow-ups

- **No `e2e/TESTIDS.md` section for this vertical.** The screen-specific ids placed here follow the file's conventions but are not yet registered: `new-sync-message-button`, `create-sync-message-modal`, `sync-message-modal`, `sync-message-save-error`, `sync-message-error`, `sync-messages-stale`, `sync-message-body`, `sync-message-from` / `-to` / `-status` / `-type`, `sync-message-logs-checkbox`, `sync-message-database-checkbox`, `sync-message-file-row`, `sync-message-file-error`, `store-search-input`; the filter chip is the shared `filter-input-status` → `filter-option-new|inProgress|processed|error`, and the column ids are `fromStore`, `toStore`, `createdDatetime`, `status`, `type`, `errorMessage`. TESTIDS.md is an IMPLEMENTING input, so it was left for the e2e-authoring pass to extend.
- **A filter-definition test could not be colocated.** Importing `list/listFilters.tsx` into vitest fails at module load — `FilterBar` pulls in `@kobalte/core`, which calls a client-only API against Solid's server build, and the workspace's `solid` project externalises `node_modules` so its `browser` condition does not reach it. `.6` is therefore asserted at the list-state level instead. Inlining `@kobalte/core` in `vitest.workspace.ts` would fix it for every vertical; that is shared test infrastructure, so it was not changed here.
- **Two upstream backend issues are still unfiled** (carried from the spec stage, restated because this build is the thing they constrain): `SyncMessageFilterInput` has no `type` field, and its declared `createdDatetime` is never mapped. Both are the substance of D97 and both should become `open-msupply` issues; until then the register cannot offer either filter.
- **The status sort's order is backend-dependent** (Postgres enum-declaration order with `IN_PROGRESS` last; SQLite lexicographic). Nothing here needs to change — the column is presented as a grouping only — but any e2e test that asserts a status-sorted sequence must know which backend it runs on.

## Probe residue

One record was created on the central probe server (`:8890`) while verifying the create path live, and it is **permanent — no delete operation exists anywhere in this vertical**:

| Id                                     | Destination                  | Left as                                                 |
| -------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `019fe955-33b7-756c-b7fb-9c29b3608afc` | Tamaki Central Medical Store | _Processed_ — support upload, no artefacts, so no files |

(The five records `spec/sync-message/README.md` lists are still there, plus three from an earlier session — one of them `build-sm-ab2bb160-…`, the eleven-log-file Processed message used above to check the Files section.)
