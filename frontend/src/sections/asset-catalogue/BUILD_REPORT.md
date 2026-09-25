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

## Coverage (`acceptance.md` → test)

Unit = colocated vitest; **e2e** = the deterministic suite still to be written (#942), which owns what needs the running app; **live** = verified by driving the running app during this build (above), pending the e2e suite.

| Anchor                                     | Covered by                                                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| AC-A1, AC-A3, AC-A4                        | live-verifiable only on an unpinned server — **e2e** (the harness pins central, so these need a second server; see flags)          |
| AC-A2                                      | `refusals.test.ts` (the off-central refusal's mapping) · **e2e**                                                                   |
| AC-A5, AC-A6, AC-A7, AC-A8                 | `access.test.ts` (what each write lacks) · live (AC-A5) · **e2e**                                                                  |
| AC-A9, AC-A10                              | `access.test.ts` · server-side, **e2e** (wire)                                                                                     |
| AC-A11                                     | navigation's gate — **e2e**                                                                                                        |
| AC-L1–AC-L13                               | live (L1–L3, L6, L7, L10, L12) · **e2e**                                                                                           |
| AC-F1                                      | live · **e2e**                                                                                                                     |
| AC-F2, AC-F3                               | `catalogue/catalogueList.test.ts` · live                                                                                           |
| AC-F4–AC-F11                               | live (F5) · **e2e**                                                                                                                |
| AC-C1, AC-C3                               | `import/catalogueImport.test.ts` (the insert keeps case; a blank manufacturer is sent as none) · **e2e** (the server's acceptance) |
| AC-C2, AC-C4                               | server behaviour — **e2e** (wire)                                                                                                  |
| AC-I1                                      | `import/catalogueImport.test.ts`                                                                                                   |
| AC-I2                                      | the shared `isCsvFileName` (`domain/csvImport`, tested there) · **e2e**                                                            |
| AC-I3, AC-I5–AC-I17, AC-I19–AC-I25, AC-I28 | `import/catalogueImport.test.ts` · live (I3, I4, I6–I11, I14, I16, I17, I18, I21, I22, I24, I25)                                   |
| AC-I4, AC-I26, AC-I27                      | live (I4) · **e2e**                                                                                                                |
| AC-I18                                     | `import/catalogueImport.test.ts` (`rowsCsv`) · live                                                                                |
| AC-E1                                      | `catalogue/catalogueList.test.ts` (columns) · **e2e** (file name, all pages)                                                       |
| AC-E2, AC-E4                               | **e2e**                                                                                                                            |
| AC-E3                                      | **partly built** — nothing downloads, but nothing is said (flags)                                                                  |
| AC-D1, AC-D2                               | live · **e2e**                                                                                                                     |
| AC-D3, AC-D4                               | `refusals.test.ts` · live                                                                                                          |
| AC-D5–AC-D9                                | server behaviour — **e2e**                                                                                                         |
| AC-R1, AC-R2                               | live (R2 without the row count — flags) · **e2e**                                                                                  |
| AC-R3, AC-R4, AC-R5, AC-R6                 | live (R3, R5) · **e2e**                                                                                                            |
| AC-R7, AC-R8                               | `reasons/logReasons.test.ts` · live                                                                                                |
| AC-R9, AC-R10, AC-R11                      | `reasons/logReasons.test.ts` · live (R9 for Unserviceable, R10)                                                                    |
| AC-R12                                     | `refusals.test.ts` (a refusal becomes the modal's message) · **e2e**                                                               |
| AC-R13, AC-R14                             | `refusals.test.ts` (R13) · live                                                                                                    |
| AC-R15, AC-R16                             | cross-vertical (equipment) — **e2e**                                                                                               |
| AC-R17                                     | **e2e** (needs a datafile with no reason)                                                                                          |
| FL1–FL4                                    | **e2e**                                                                                                                            |

**C2 (real backend):** no CI tooling exercises the colocated tests against a server; the live drive above and the e2e suite (#942) are the real-backend leg.

## Flags

- **Nothing-to-export notice (AC-E3).** The spec says an export with nothing in it _says so_. The shared `ListExportAction` reverts silently when its CSV builder returns nothing, and changing that reaches every list's export. Built as the shared control behaves; needs either a library change (an empty-state flash on `ListExportAction`) or the spec sentence relaxed.
- **No row count on the log-reasons list (S3, AC-R2).** `DataTable` reads the toolbar count from `pagination.total`, so an unpaginated table shows none. Needs a library `count` input, or the S3 sentence relaxed.
- **The step indicator is not navigable (S2).** `ProgressList` has no click, so "Upload is always reachable" is built as an **Upload a new one** action (`button.upload-a-new-one`) above the review table, in every review state — needed both to fix a blocked file and to re-upload corrected refused rows.
- **The review table sorts in place but has no filter bar (S2).** The spec says "sortable and filterable in place"; there is no local filter bar for an in-memory table.
- **Off-central and cross-vertical anchors need the e2e rig.** AC-A1/A3/A4 need a server that is not central; AC-R15/R16 need the equipment screens.
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
