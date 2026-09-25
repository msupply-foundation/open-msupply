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

The anchors are the behaviours in `spec/asset-catalogue/cases/` (`OMS-REG-CAT-01`–`03`, `-09`); `acceptance.md` maps the retired `AC-*` ids onto them. Ids below drop the `OMS-REG-CAT-` prefix (`01.28` is `OMS-REG-CAT-01.28`). Unit = colocated vitest; **e2e** = the deterministic suite (#942), which owns what needs the running app; **live** = verified by driving the running app during this build (above), pending that suite.

| Behaviours                                                      | Covered by                                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `01.1`–`01.4`, `01.6`, `01.7`, `01.8`, `01.17`, `01.20`–`01.23` | live · **e2e**                                                                                  |
| `01.5`, `01.9`–`01.16`, `01.18`, `01.19`, `01.27`               | **e2e**                                                                                         |
| `01.25`, `01.26`                                                | `catalogue/catalogueList.test.ts` · live                                                        |
| `01.24`, `01.28`–`01.31`                                        | **e2e** on a server that is not central (the harness pins central — flags)                      |
| `01.32`                                                         | **e2e** (wire)                                                                                  |
| `02.1`, `02.2`, `02.17`, `02.18`, `02.20`                       | **e2e**                                                                                         |
| `02.3`                                                          | `catalogue/catalogueList.test.ts` (columns) · **e2e**                                           |
| `02.4`, `02.7`–`02.14`, `02.22`–`02.35`, `02.37`, `02.39`       | `import/catalogueImport.test.ts` · live (most)                                                  |
| `02.6`, `02.15`, `02.16`, `02.21`, `02.36`, `02.38`             | live (`02.6`, `02.15`) · **e2e**                                                                |
| `02.19`                                                         | pending in its case — the shared export's empty-state notice (flags)                            |
| `03.1`, `03.10`, `03.12`–`03.16`, `03.22`, `03.26`              | live (`03.1`, `03.10`, `03.12`–`03.15`, `03.22`; `03.14` without a row count — flags) · **e2e** |
| `03.2`–`03.9`, `03.17`–`03.20`                                  | `reasons/logReasons.test.ts` · live (`03.7`, `03.17`, `03.18`, `03.19`)                         |
| `03.11`, `03.21`                                                | `refusals.test.ts` (`03.21`: a refusal becomes the editor's message) · **e2e**                  |
| `03.23`–`03.25`                                                 | cross-vertical (equipment) — **e2e**                                                            |
| `03.27`–`03.29`, `03.33`                                        | **e2e** on a server that is not central; `03.33`'s mapping in `refusals.test.ts`                |
| `03.30`–`03.32`                                                 | `access.test.ts` · **e2e**                                                                      |
| `09.1`–`09.3`, `09.10`                                          | live (`09.1`, `09.2`) · **e2e**                                                                 |
| `09.4`–`09.6`                                                   | `refusals.test.ts` · live                                                                       |
| `09.7`–`09.9`, `09.11`                                          | server behaviour — **e2e**                                                                      |
| `09.12`–`09.14`                                                 | `access.test.ts` · live (`09.12`) · **e2e**                                                     |
| `09.15`                                                         | `refusals.test.ts` (mapping) · **e2e** on a server that is not central                          |

**C2 (real backend):** no CI tooling exercises the colocated tests against a server; the live drive above and the e2e suite (#942) are the real-backend leg.

## Flags

- **Nothing-to-export notice (`OMS-REG-CAT-02.19`, pending in its case).** The spec says an export with nothing in it _says so_. The shared `ListExportAction` reverts silently when its CSV builder returns nothing, and changing that reaches every list's export. Built as the shared control behaves; needs either a library change (an empty-state flash on `ListExportAction`) or the spec sentence relaxed.
- **No row count on the log-reasons list (S3, `OMS-REG-CAT-03.14`).** `DataTable` reads the toolbar count from `pagination.total`, so an unpaginated table shows none. Needs a library `count` input, or the S3 sentence relaxed.
- **The step indicator is not navigable (S2).** `ProgressList` has no click, so "Upload is always reachable" is built as an **Upload a new one** action (`button.upload-a-new-one`) above the review table, in every review state — needed both to fix a blocked file and to re-upload corrected refused rows.
- **The review table sorts in place but has no filter bar (S2).** The spec says "sortable and filterable in place"; there is no local filter bar for an in-memory table.
- **Off-central and cross-vertical anchors need the e2e rig.** the off-central behaviours need a server that is not central; `03.23`–`03.25` need the equipment screens.
- **The filter chip's menu stays open after a pick** — the shared `FilterSelect`; stocktakes behaves the same. Not this vertical's.

## Decisions the spec should take (candidate refinements)

- **The partial-delete outcome's heading** reads _Can't do that!_ (`heading.cannot-do-that`, the phase-tracking title of `kdd/action-modal`) though some records were deleted. The spec names the banner's content, not the heading.
- **Two new strings, no reference key** (the reference reports no refusal at all): `error.asset-catalogue-item-in-use` — _Equipment uses this catalogue item, so it cannot be deleted._ — and `messages.error-deleting-assets` (_{{count}} asset(s) could not be deleted_, after `messages.error-deleting-reasons`). Added to `en` only.
- **A blank manufacturer is sent as none**, so it never joins the manufacturer/model/type check (rules § identity). The reference sends an empty string, which does join it.
- **A bad property value is still reported once per definition of its key**, as the README captures. De-duplicating is one line in `readProperty`; worth a ruling.
- **The Comments required column's help text** rides the header's `title` attribute — `DataTable` has no column-description slot (the reference shows it in the column menu).
- **The number cells use the shared import reader** (`parseImportNumber`), so `12,5` reads as 12.5 where the reference's `Number()` refuses it.
- **`spec/PROGRESS.md`'s Build cell is ticked here.** A build never edits `spec/`, but `check-progress.mjs` (in `pnpm check`) requires the tick in the change that adds the section; the row is a tracker, not behaviour.

## Follow-ups

- The deterministic e2e suite (#942) — the **e2e** rows above, plus the test ids used here recorded in `e2e/TESTIDS.md` (`import-catalogue-button`, `manage-log-reasons-button`, `create-log-reason-button`, `import-*`, `log-reason-*`).
- Library: `ListExportAction` empty feedback; a `DataTable` count without pagination; a navigable `ProgressList` step.
