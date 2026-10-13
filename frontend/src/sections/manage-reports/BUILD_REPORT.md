# Build report — manage-reports

**Target stack:** SolidJS + Vite; shared component library `src/ui/` resolved through [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build: **manage-reports** only, generated from [`spec/manage-reports/`](../../../spec/manage-reports/) (reverse spec). A new vertical — nothing was wiped, because `src/sections/manage-reports/` did not exist. Gates at completion: `pnpm check` ✓ · `pnpm test` ✓ (2446 repo-wide, incl. 32 new for this vertical) · `pnpm build` ✓ (`ReportsList` chunk ~10 kB / gzip ~3.5 kB).

Replaces the "Coming soon" fall-through at `manage/reports`: `'manage/reports': manageReportsRoutes` added to `sectionRoutes` in [`src/App.tsx`](../../App.tsx). The nav entry and its `centralAdmin` gate already existed ([`src/nav/navConfig.ts`](../../nav/navConfig.ts)) and were not touched.

**Zero locale keys added.** All 21 keys the surface names are cited in `ui-surface.md` (resolved against the reference app's own `t()` call sites per reverse-spec §6) and all 21 already exist in `src/intl/locales/en/common.json`. Shared-file edits: `src/App.tsx` (the route entry). The transfer route is the shared `UPLOAD_URL` in `src/config.ts`, which plugin install also uses. `/upload` was already proxied in `vite.config.ts`.

## Behaviour coverage

Anchors are `OMS-REG-MNG-06.<n>` from [`cases/OMS-REG-MNG-06`](../../../spec/manage-reports/cases/OMS-REG-MNG-06%20-%20Validate%20Report%20Administration.md).

| Behaviour                                    | Coverage                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| .1 every version listed, one row per version | structural — the read applies no grouping; server-shaped rows render as returned              |
| .2 inactive listed alongside active          | `reportRegister.test.ts` — no `isActive` filter is ever sent, with or without a search        |
| .3 same rows whichever store                 | `reportRegister.test.ts` — `storeId` travels but shapes nothing else in the variables         |
| .5 name and code the only filters            | `reportRegister.test.ts` (empty/cleared filters not sent) + `listFilters.tsx` exhaustive map  |
| .9 installing adds every report in a bundle  | `reportInstall.test.ts` — all returned ids surfaced, not just the first                       |
| .15 rejections indistinguishable             | `reportInstall.test.ts` — all three causes fold onto one `rejected` outcome                   |
| .16 / .24 / .26 failure ends the attempt     | `reportInstall.test.ts` — at most one failed file; server's words carried through             |
| .17 save needs an actual change              | `reportEditor.test.ts` — incl. toggling back to the stored value                              |
| .18 abandoned edit writes nothing            | `reportEditor.test.ts` — the draft is a copy; Cancel fires no mutation                        |
| .21 active state the only mutable property   | `reportEditor.test.ts` — input and draft carry exactly `{id, isActive}`                       |
| .23 chosen-but-unconfirmed installs nothing  | `reportInstall.test.ts` — install runs only on confirm                                        |
| .27 over 50 MiB refused before sending       | `reportInstall.test.ts` — limit pinned to the server's; the oversized file is named           |
| .34 rest of that pick still taken            | `reportInstall.test.ts` — `judgePick` takes the files under the limit                         |
| .29 non-json name refuses the whole pick     | `reportInstall.test.ts` — `judgePick`, incl. a name failure on an oversized file              |
| .30 "json" ending passes, extension or not   | `reportInstall.test.ts` — `bundlejson`, `.geojson`                                            |
| .33 an accepted pick replaces the selection  | `reportInstall.test.ts` — the accepted pick is the whole new selection; an empty drop no-ops  |

The register's sort handling (one entry, passed through, no client re-sort) is the contract's wire trap rather than a behaviour; `reportRegister.test.ts` pins it.

### Not covered here, with reasons (C1 exemptions)

| Behaviour                                           | Why                                                                                                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| .6 / .28 register refused, then shown once granted  | Server-enforced; no client leg exists. The screen mounts behind the nav gate and the query is refused server-side. Owned by the `e2e/` suite.            |
| .7 / .8 install and activate refused on a remote    | Needs a remote server — the case frontmatter marks the vertical `automatable: partial` for exactly these two.                                            |
| .10 installing replaces without confirmation        | The absence of a confirmation step is structural (no such control is rendered); the replacement itself is server behaviour. Real-backend leg — C2 gap.   |
| .11 / .12 / .13 / .32 active state on install       | Entirely server-computed in `upsert_reports`; the client sends no active state. Verified live during reverse-spec, but untestable at this layer. C2 gap. |
| .14 install overwrites the how-to-read message      | A server side effect into the custom-translations store, invisible to this vertical's operations. C2 gap.                                                |
| .19 / .20 deactivation promotes the next version    | The runner's version selection, owned by `spec/reports/`. Observable only by reading the runner's own query after a change here. C2 gap.                 |
| .22 no operation removes a version                  | Proven by absence — `CentralReportMutations` declares only install and update, so no delete can be called. Nothing to assert beyond the schema.          |

**C2 real-backend leg:** owed to this vertical's `e2e/` suite (see follow-ups), which runs against a real server like the other verticals' regression suites. Every behaviour above marked "C2 gap" was verified by hand against a live central server and a remote server (install, replacement, inheritance, promotion, both refusal paths) — recorded here rather than faked with a mock.

## Flags

- **No ⛔ roles.** Every role the surface names resolves to a built component: `UploadZone` for the file entry, `FilterBar`/`FilterTextInput` for the two searches, `DataTable`, `Dialog`, `Checkbox`, `Alert`.
- **No spec gaps hit.** Every operation, type and error `contract.md` names resolved in `schema.graphql`.
- **No `⚠️ VERIFY` items** — the spec carries none.
- **One `solid/reactivity` lint warning, deliberate.** `ReportEditModal` reads `props.version` once on mount to seed the draft, so a rejected save keeps what the user chose. The dialog is mounted only while open (`<Show>` callback form, keyed on the version), so there is nothing to react to. `campaigns` carries the identical warning for the identical reason.

## Decisions the spec should make

None outstanding. The partial-install behaviour was **observed in the running reference
app** (three bundles, the middle one unreadable) rather than decided here, and the spec
now states it: [rules § several files at once](../../../spec/manage-reports/rules.md#several-files-at-once),
behaviours `.16` `.24` `.25` `.26`.

What the observation established, and the build now matches: the first failure ends the
attempt (two `POST /upload` requests were made for three chosen files); reports installed
before it stay installed; the register refreshes per-install, behind the still-open
dialog (45 → 46 rows); the chosen files are left untouched; and the message carries the
server's own words.

**Toasts are not carried.** The reference reports both outcomes as toasts.
[`ui-standards/controls.md` § action feedback](../../../spec/ui-standards/controls.md#action-feedback)
forbids that — an outcome belongs in the surface that initiated it, a success as the
visible result, a failure as an inline notice. So success is the dialog closing plus the
refreshed register, and failure is an inline notice in the open dialog.

**Not restated in `rules.md`, deliberately:** an empty filter object is sent as
`undefined` rather than `{}` so a no-op filter edit cannot change the resource key. Wire
encoding with no user-observable counterpart, so per AUTHORING it stays out of the spec.

## Follow-ups

- **`e2e/` suite + `client/` testids** — PR 2. Screen-specific ids placed here: `upload-reports-button`, `report-edit-modal`, `report-enabled-checkbox`, `report-name` / `-version` / `-custom`, `report-save-error`, `report-upload-modal`, `report-upload-input`, `report-upload-file-list`, `report-upload-remove-<file>`, `report-upload-error`. These need adding to [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md) with the suite, per C8.
- **Exploratory workflow** at `exploratory/workflows/manage-reports.md` — still owed (reconcile step 2), and it runs before the suite is authored.
- Blocked on no shared component.
