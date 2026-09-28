# Build report — asset-catalogue

**Target stack:** SolidJS + Vite, composed from the shared library in `src/ui/` through the roles in `spec/ui-standards/components.md`. Built from `spec/asset-catalogue/` (issue #940), scoped: no other vertical touched.

## What was built

| Surface                                                                                                  | File                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes (`catalogue/assets`, `catalogue/assets/log-reasons`)                                              | `index.tsx`, registered in `src/App.tsx` `sectionRoutes`                                                                                      |
| S1 catalogue list — filters, sort, paging, export, selection + delete, Import / Manage asset log reasons | `catalogue/CatalogueList.tsx`, `catalogue/catalogueFilters.tsx`, `catalogue/actions/ExportCatalogueAction.tsx`, `catalogue/catalogueToCsv.ts` |
| S2 import modal — template, upload checks, review, per-row run, refused rows                             | `import/ImportCatalogueModal.tsx`, `import/catalogueImport.ts`                                                                                |
| S3 log-reasons list — status filter, status sort, selection + delete                                     | `reasons/LogReasonsList.tsx`, `reasons/logReasons.ts`                                                                                         |
| S4 create log reason                                                                                     | `reasons/CreateLogReasonModal.tsx`                                                                                                            |
| S5 confirmations and outcomes (both bulk deletes)                                                        | `DeleteSelectedAction.tsx`, `refusals.ts`                                                                                                     |
| The write gates (central server + permission mirror)                                                     | `access.ts`                                                                                                                                   |

Operations are the ones `contract.md` names, in `catalogue/catalogue.graphql`, `import/catalogueImport.graphql` and `reasons/logReasons.graphql`; `pnpm codegen` produced no drift outside the vertical.

## Gates

`pnpm check` green · `pnpm test` green (326 files, 3948 tests; 57 of them this vertical's) · `pnpm build` green · `eslint` and `prettier --check` clean on the vertical.

Every screen was also driven live (headless Chromium) against a central-pinned server built from `develop` with the e2e reference datafile: the list, all six filters (the type options narrowing to the chosen category), the four sort keys, paging, the empty state, the phone-width card view, a bulk delete mixing an in-use and a free item, the import with a blocked file, a file with a server refusal (refused-rows download checked), a clean import (stored values checked in the database), the log-reasons list, create, status filter, delete, the crumb back, and the permission-denied path as the query-only `limited` user. No console errors on any screen.

## Coverage (behaviour → test)

The anchors are the behaviours in `spec/asset-catalogue/cases/` (`OMS-REG-CAT-01`–`03`, `-09`); `acceptance.md` maps the retired `AC-*` ids onto them. Ids below drop the `OMS-REG-CAT-` prefix (`01.28` is `OMS-REG-CAT-01.28`). **e2e** = `e2e/specs/asset-catalogue-regression.spec.ts`, green on both front ends; **e2e (this FE)** = in that suite but skipped on the current app, which deliberately differs (named at each test); unit = colocated vitest.

| Behaviours                                                      | Covered by                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `01.1`–`01.19`, `01.21`–`01.23`, `01.27`, `01.32`               | **e2e**                                                                                         |
| `01.20`, `01.25`, `01.26`                                       | **e2e (this FE)** · `01.25`/`01.26` also `catalogue/catalogueList.test.ts`                      |
| `01.24`, `01.28`–`01.31`                                        | out of scope — off the central server; the e2e harness pins central stack-wide                  |
| `02.1`–`02.4`, `02.6`–`02.16`, `02.21`–`02.24`, `02.26`–`02.38` | **e2e** · the file rules also `import/catalogueImport.test.ts`                                  |
| `02.17`, `02.18`, `02.25`, `02.39`                              | **e2e (this FE)** · `02.25`/`02.39` also `import/catalogueImport.test.ts`                       |
| `02.19`                                                         | pending in its case (the shared export's empty-state notice — flags)                            |
| `02.20`                                                         | out of scope — off the central server                                                           |
| `03.1`–`03.14`, `03.17`–`03.20`, `03.22`–`03.25`, `03.32`       | **e2e** · `03.17`–`03.20` also `reasons/logReasons.test.ts`                                     |
| `03.15`, `03.16`, `03.30`, `03.31`                              | **e2e (this FE)** · `03.30`/`03.31` also `access.test.ts`                                       |
| `03.21`                                                         | out of scope for e2e (no refusal reachable from the editor on the harness) · `refusals.test.ts` |
| `03.26`                                                         | out of scope — needs a datafile with no live reason                                             |
| `03.27`–`03.29`, `03.33`                                        | out of scope — off the central server · `03.33`'s mapping in `refusals.test.ts`                 |
| `09.1`–`09.5`, `09.7`–`09.11`, `09.14`                          | **e2e** · `09.4`/`09.5` also `refusals.test.ts`                                                 |
| `09.6`, `09.12`, `09.13`                                        | **e2e (this FE)** · `09.12`/`09.13` also `access.test.ts`                                       |
| `09.15`                                                         | out of scope — off the central server · mapping in `refusals.test.ts`                           |

**C2 (real backend):** the e2e suite runs against a real server on both front ends; the colocated tests are logic only.

## Flags

- **Found by the e2e suite and fixed: a non-CSV file was silently ignored.** The import handed the upload zone `accept=".csv"`, so a `.txt` arrived as a rejection and never reached the invalid-file handling; the modal did nothing where the current app says _Invalid file_ (`OMS-REG-CAT-02.21`). The modal now handles the zone's rejection the same way.

- **Found by the exploratory run and fixed: a running import could be left, and its refused rows lost** (`CAT-20260925-F3`, `OMS-REG-CAT-02.35`). Two causes:
  - **Escape.** Pressing OK & next turns it into a disabled spinner and withdraws Cancel, so the focused control drops focus to `<body>`, outside the dialog. Escape then skipped the dialog and reached the app's navigate-up rung, leaving the list with the dialog in it. Fixed twice over, in shared code: the Escape ladder (`keyboard/globalActions.ts`) stops at an open `dialog:modal`, whatever the browser or however focus moved; and `Dialog` re-parks focus on its panel when a focused control inside it is disabled, so Escape and Tab keep working in the dialog after a busy state.
  - **A double-click.** The dialog shrank for the run and again to the refused rows, so the second click landed on the scrim once the run was over. `Dialog`'s new `holdHeight` flag keeps the box at the height it had when the hold began (Dialog measures itself, clamped to the viewport cap); the import holds it from OK & next through the refused rows.
  - Guarded by two e2e tests; the Escape one runs on this FE only, since the current app has the defect too.

- **Nothing-to-export notice (`OMS-REG-CAT-02.19`, pending in its case).** The spec says an export with nothing in it _says so_. The shared `ListExportAction` reverts silently when its CSV builder returns nothing, and changing that reaches every list's export. Built as the shared control behaves; needs either a library change (an empty-state flash on `ListExportAction`) or the spec sentence relaxed.
- **No row count on the log-reasons list (S3, `OMS-REG-CAT-03.14`).** `DataTable` reads the toolbar count from `pagination.total`, so an unpaginated table shows none. Needs a library `count` input, or the S3 sentence relaxed.
- **The step indicator is not navigable (S2).** `ProgressList` has no click, so "Upload is always reachable" is built as an **Upload a new one** action (`button.upload-a-new-one`) above the review table, in every review state — needed both to fix a blocked file and to re-upload corrected refused rows.
- **Off-central and cross-vertical anchors need the e2e rig.** the off-central behaviours need a server that is not central; `03.23`–`03.25` need the equipment screens.
- **The filter chip's menu stays open after a pick** — the shared `FilterSelect`; stocktakes behaves the same. Not this vertical's.

## Decisions the spec should take (candidate refinements)

- **The partial-delete outcome's heading** reads _Can't do that!_ (`heading.cannot-do-that`, the phase-tracking title of `kdd/action-modal`) though some records were deleted. The spec names the banner's content, not the heading.
- **New strings, no reference key** (the reference reports no refusal at all): the refusals translate through the house `server-error.<Variant>` keys (`rejectionFrom`) — `server-error.AssetCatalogueItemInUse`, `-AssetCatalogueItemDoesNotExist`, `-ReasonDoesNotExist`, `-AssetLogReasonAlreadyExists`, and `-NotACentralServer` for the central-server wrapper's plain-sentence refusal — and `messages.error-deleting-assets` (_{{count}} asset(s) could not be deleted_, after `messages.error-deleting-reasons`). Added to `en` only.
- **A blank manufacturer is sent as none**, so it never joins the manufacturer/model/type check (rules § identity). The reference sends an empty string, which does join it.
- **A bad property value is still reported once per definition of its key**, as the README captures. De-duplicating is one line in `readProperty`; worth a ruling.
- **The Comments required column's help text** is declared as the column's `meta.description`; the header tooltip that renders it is the table's own follow-up (`columnTypes.ts`).
- **The number cells use the shared import reader** (`parseImportNumber`), with the comma as the decimal separator in a `;`-separated file as the sibling imports read it, so `12,5` reads as 12.5 where the reference's `Number()` refuses it (`CAT-20260925-F4`, for a ruling).
- **`spec/PROGRESS.md`'s Build cell is ticked here.** A build never edits `spec/`, but `check-progress.mjs` (in `pnpm check`) requires the tick in the change that adds the section; the row is a tracker, not behaviour.

## Follow-ups

- Library: `ListExportAction` empty feedback; a `DataTable` count without pagination; a navigable `ProgressList` step.
