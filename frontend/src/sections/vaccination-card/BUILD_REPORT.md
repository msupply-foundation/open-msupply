# Build report — vaccination-card

**Target stack:** SolidJS + Vite, the shared component library in `src/ui/` resolved through the roles in `spec/ui-standards/components.md`. Built from `spec/vaccination-card/` (#1370, #1371) on `fe/892-vaccination-card-build`, stacked on the spec branch, based on `feature/custom-forms` (the encounter record screen lives there).

## What was built

- **S1 — the card from the patient** (`VaccinationCardView`), mounted under the patients section at `…/patients/:patientId/vaccination-card/:programEnrolmentId`; a Vaccinations tab row now opens it (`OMS-REG-DIS-02.52`).
- **S2 — the card inside an immunisation encounter** (`VaccinationCardRegion`), rendered by `sections/encounters/EncounterDetailView` beneath the encounter form when its enrolment is an immunisation one (`EncounterRecord` gained `programEnrolment { id isImmunisationProgram }`). Lazy, under its own `<Suspense>`, so non-immunisation encounters don't load it and loading it never suspends the screen.
- **S3/S4 — the dose editor and its save questions** (`DoseEditorDialog`).
- Pure logic, tested in node: `cardModel.ts` (which doses open, editability, skip, the card's counts and words), `doseDraft.ts` (draft, checks, the stock-transaction switch, confirmations, insert/update payloads, batches), `cardApi.ts` (fetchers, save outcomes).
- 21 English locale keys for Product's new copy (`label.status-due`, `label.not-yet-due`, `button.record-dose`, …); none elsewhere.

Gates: `pnpm check`, `pnpm test` (409 files / 5 114 tests; this vertical 63), `pnpm build` green; the eight e2e suites `pnpm e2e:affected --base origin/feature/custom-forms` names (chrome, patients, settings, prescription-requests, prescriptions, stock-allocation, dashboard, login) green — 220 passed, 11 designed skips. Every screen driven live against a develop server on a throwaway copy of the e2e datafile (see [live drive](#c2--real-backend)).

## Anchor coverage

Unit tests cite their behaviour in the `describe` title.

| Behaviours                                                                                                     | Test                |
| -------------------------------------------------------------------------------------------------------------- | ------------------- |
| `OMS-REG-DIS-06.2`, `.25`–`.29`, `.34`–`.39`, `.67`–`.75`, `.77`; `OMS-FUN-VAC-002.6`                          | `cardModel.test.ts` |
| `OMS-REG-DIS-06.3`–`.5`, `.8`–`.11`, `.14`–`.21`, `.43`, `.44`, `.46`, `.51`–`.59`, `.61`; `OMS-FUN-VAC-002.5` | `doseDraft.test.ts` |
| `OMS-REG-DIS-06.45`, `.48`, `.60`, `.63`, `.64`                                                                | `cardApi.test.ts`   |

Every behaviour except `.65`/`.66` is also asserted end to end, against the real backend, by [`e2e/specs/vaccination-card-regression.spec.ts`](../../../e2e/specs/vaccination-card-regression.spec.ts) (#1372) — screen and wire, stock included.

**Not covered by a unit test — and why** (each was exercised in the live drive unless noted):

| Behaviours                                                                                    | Why                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OMS-REG-DIS-06.1`, `.6`, `.7`, `.12`, `.23`, `.24`, `.47`, `.62`, `.76`                      | Rendered-screen outcomes (the card on the encounter, the row after a save, the row opening the card, the read-only card, the prescription link, a cancelled question, the field order). In the e2e suite.                                                                                                                             |
| `OMS-REG-DIS-06.22`, `.30`–`.33`, `.40`–`.42`, `.49`, `.50`; `OMS-FUN-VAC-002.3`, `.9`, `.10` | The server's: suggested dates, the order guards, the issued dose and its prescription. The front end only shows them; the e2e suite asserts them against the real backend (C2).                                                                                                                                                       |
| `OMS-REG-DIS-06.65`, `.66`                                                                    | **Pending (#746)**, marked so in the case: the encounter screen on `feature/custom-forms` has no "mark as visited on leaving" prompt and no "schedule next encounter" flow — its leave guard covers unsaved changes only. The region exposes `onDoseSaved` for the screen to arm the prompt once it has one (`kdd/custom-forms` H26). |

## C2 — real backend

The automated real-backend leg is the e2e suite (#1372), on the hermetic stack's EVAX clinic and `e2e_vax_card` program (`server/data/e2e/README.md`). Before it, driven by hand, headless, against a develop server (`:8190`, throwaway copy of `e2e_617_demo` with a seeded immunisation program): the card from the patient; the card on an encounter; a new dose — the required checks, given, item, the batch list in doses, Record dose, one dose issued (DPT-A 59 → 58 doses), the reopened dose keeping its batch with no Save; not given with the reason required and shown in the reason column; a skip on a course that allows it (no Not given, the warning, the skip question, the earlier dose filled as Not given with the server's sentence); a dose at another facility (name required, clinician and batch gone). No console errors.

## Flags

- **Spec corrected on the spec branch (`3042785285`) while building:** the Age column's weeks were "months × 4.345", which reads the course editor's 1.5 months (six weeks) as 7; they count four weeks to the month, as the editor does (Product's prototype used 4.345 against data entered exactly — 6 weeks = 1.38 months). And the two counts are spelt out as Product's prototype has them: Due doses that would open, and every Overdue dose as catch-up.
- **Backend gap:** `VaccinationCardItemNode` carries no `notGivenReason` (`contract § the card at a glance`); the card reads each not-given dose's vaccination — one extra request per not-given row.
- **Library gaps (worked around, not improvised):**
  - `RadioGroup` takes no `error`: the given / not-given "required" shows as a compact error `Alert` beneath it.
  - The static `Table` has no cell tone for "danger": the expired date's colour is a section CSS class on a span.
  - `DataTable` has no row-group spanning: the Age column drops its divider inside an age group through a section CSS selector on `cell-age` (as Product's prototype does).
- **Library trap hit:** a `Dialog` forwards its native `close` to `onClose` while its `open` prop is true — so swapping one `Dialog` for another (loading → loaded) closed the editor. The loading dialog now forwards a close only while still loading. Worth a note in the Dialog's docs.

## Decisions the spec should make

- **Footer of a read-only dose:** Cancel alone (no disabled Save). The spec says fields are disabled; it doesn't say what Save does.
- **Record dose vs Save:** a new dose's action is **Record dose** (Product's prototype); a recorded dose's is the shared **Save**. The prototype shows only the new-dose case.
- **The card's place on the encounter screen:** beneath the encounter form, at the wide measure, not in tabs. The current app uses tabs (Vaccinations first); the encounter screen's own spec (H26) should settle it.
- **Facility as an autocomplete** for two or three options (the spec's role); a single-select would fit the set better.

## Follow-ups

- Two findings the e2e suite raised were fixed (`exploratory/runs/vaccination-card-findings.md`): VC-20261013-F5 — choosing given on a recorded not-given dose now presets the course's only item (`doseDraft.chooseGiven`); VC-20261013-F6 — a save refused for a missing permission raises the permission-denied notice instead of the editor's generic error (`saveDose` returns `forbidden`). The spec should still say which surface a permission refusal of a save uses.
- #746 / H26 — the encounter screen's visited prompt and next-encounter scheduling, then `.65`/`.66`.
- Backend — `notGivenReason` on the card row.
