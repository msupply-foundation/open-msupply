# Build report — program-enrolment

**Target stack:** SolidJS + Vite; shared component library `src/ui/`, every slot resolved through the roles in [`spec/ui-standards/components.md`](../../../spec/ui-standards/components.md).

Scoped build of [`spec/program-enrolment`](../../../spec/program-enrolment/README.md) (#1490, on top of the spec branch `fe/890-program-enrolment-spec`). The picker and the enrolment dialog already existed on `feature/custom-forms`, built ahead of their spec (custom-forms plan H8, H10); this build moves them into this section, brings them to the spec, and adds the host's enrolment ID field. Status history and closing (`OMS-REG-PAT-04.40`–`.50`) are #1491 and stay pending.

**Gates: green.** `pnpm check` · `pnpm test` (all files, including 64 new tests: 20 in this section, 44 in `src/domain/documentForm/`) · `pnpm build` (the field and its query sit in the lazy form library chunk, 42.36 kB gzip; nothing reaches the eager entry, which `vite/lazyChunkGuard.ts` checks) · ESLint on every changed file · the `check-reactivity` review (below).

## Built

- **S2 program picker** (`ProgramPickerDialog.tsx`, moved from `sections/patients/detail/programs/`). Options are now in **name order**: the server lists them by registry id. Enrolled programs stay listed, disabled, and marked Enrolled. When there are none, the no-programs notice shows. Enrol is disabled until a program is chosen.
- **S3 enrolment** (`EnrolmentModal.tsx`, moved). Two save guards, both opt-in options on the shared document form host, so encounters and the patient document are unchanged:
  - `refuseNewerVersion` re-reads the enrolment's newest version just before an update. A different version id refuses the save and sends nothing. `newerVersion()` then drives a warning banner, `enrolment-newer-version`.
  - `onForbidden` takes a `Forbidden` refusal to `reportPermissionDenied`, the app's permission-denied modal, instead of the inline banner.

  Every other refusal shows "Failed to save program enrolment" (`error.failed-to-save-program-enrolment`), with the server's reason behind an `ErrorDetails` disclosure (`enrolment-save-error`). Both banners sit in the dialog's `footer` slot, above the actions rule, so the buttons stay at the inline end.

- **S4 default form**: unchanged (`domain/documentForm/defaults.tsx`).
- **S5 enrolment ID field** (`domain/documentForm/EnrolmentIdField.tsx`, `enrolmentId.ts`, `enrolmentId.graphql`), in the form library chunk.
  - **What it does:**
    - On a new enrolment, it generates the ID as the form opens.
    - It asks before replacing an ID.
    - It skips a generated ID another enrolment holds.
    - Typing is allowed only with `allowTyping`.
    - What is typed goes into the draft at once. It is checked once typing pauses (500 ms). A duplicate fails the field through `draft.setError`, which blocks the save until the ID changes. A save pressed before the check answers waits for it, through `draft.wait`.
  - **How it is reached:** the SDK exports it as a lazy wrapper, `EnrolmentIdField` with `EnrolmentIdFieldProps`. The demo program's enrolment form now places it in place of its own Generate button. Two demo plugin strings are gone, `heading.replace-enrolment-id` and `message.replace-enrolment-id`.
- **Engine:** `Draft.fill(path, value)` writes as part of the starting state, so the generated ID is not an edit (rules § leaving with unsaved changes). `Draft.setError(path, message, label?)` fails a field from the form's own check, like a schema error, and is cleared when the draft is seeded again. `Draft.wait(work)` makes a save wait: `save()` awaits the work only when some is pending, so a form with none saves as before. `SaveOutcome.refused` carries `forbidden` with the permission names.
- **Wiring:** `PatientDetailView` imports the two components from here. Its TO-DO now covers only New encounter and the encounter screens (H26, #789).
- **Locale:** one new key, `messages.enrolment-changed-since-opened`, in `en/` only.
- **Test ids** ([`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md)): `enrolment-save-error`, `enrolment-newer-version`, `enrolment-id`, `enrolment-id-generate`.

## Spec refinements the build exposed (made on this branch)

1. **`EnrolmentIdField` takes `record`** (and `testId`), as [sdk-contract § the enrolment form](../../../spec/plugins/sdk-contract.md#the-document-form-slots-specified-in-full) now says. The field needs the form's record view for two things: whether this open is a new enrolment, and which enrolment holds its own ID.
2. **`draft.fill`** is in the sdk-contract's draft paragraph. Generating on open would otherwise make every new enrolment read as changed, and closing it would ask to discard.
3. **The `(pending: #1490)` markers** came off `OMS-REG-PAT-04`, and `spec/PROGRESS.md`'s Build cell is ticked.
4. **A typed duplicate ID now blocks the save** (decided 2026-10-14, after the browser run below). The first rule, the current app's (flagged, not taken, the last accepted ID kept), saved a half-typed ID accepted during a pause: `GRY-000` while `GRY-0005` showed flagged. `.37` was reworded in place (never published), `.51` was added, and rules, contract, ui-surface, the README's decision 5 and the sdk-contract's draft paragraph (`setError`, `wait`) changed with it.

## The reactivity review (`check-reactivity`), and what live use found besides

- **Found and fixed:** a duplicate check still running when typing resumed could answer late, write the shorter ID, and overwrite what was being typed. Every keystroke now outdates a running check. Test: "a check still running when typing resumes never overwrites what is typed".
- **Found by hand, then in the browser run:** see refinement 4. A pause mid-typing let a half-typed ID be accepted and saved. The field now has no local copy of the ID at all: the box is the draft.
- **Found live, which the review missed:** the field captured the enrolment's ID once, in its local text signal. On a second open the form library is already loaded, so the field mounts in the same pass that seeds the draft. The seed then landed before the field's sync effect first ran, so a reopened enrolment showed an empty ID box. The box now reads the draft live, with only un-taken typing held locally. Test: "shows the ID the form seeds after the field has mounted", which failed before the fix.
- **Benign:** `openedNew` is read once (`untrack`) on purpose, since `record.documentName` changes in place after the first save. The picker's options re-map only when the registries or the patient's enrolments change, never on a pick.
- **Not a reactivity issue, noted:** if the field remounted while a draw was in flight, a second draw would spend a second counter number. The dialog does not remount its body on interaction, and nothing like it was seen live.

## Behaviour coverage (`OMS-REG-PAT-04.*`, spec/program-enrolment/cases/)

**Verified live** means driven through this build's own UI in a headless browser, last in a scripted run of the seven testing scenarios (49 of 49 checks passed), with the demo program plugin loaded from source. The server was a debug build of this branch (port 8196) on a throwaway copy of the e2e reference datafile, with a Demo Program seeded by SQL: its context, program and registry entry on the plugin's v1 schema, plus the user's document permissions.

| Anchor                                             | Automated test                                                                                | Live                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `.1` name order                                    | `ProgramPickerDialog.test.tsx`                                                                | ✅ Demo Program · E2E Immunisation… · HIV Care… · Rspec Immunisation… · Status History…                                           |
| `.2` enrolled listed, disabled, marked             | `ProgramPickerDialog.test.tsx`                                                                | ✅                                                                                                                                |
| `.3` a program the user may not view is absent     | — (the server's narrowing)                                                                    | ✅ Family Planning and the TestProgram entries absent                                                                             |
| `.4` no-programs notice                            | `ProgramPickerDialog.test.tsx`                                                                | —                                                                                                                                 |
| `.5` Enrol disabled until chosen                   | `ProgramPickerDialog.test.tsx`                                                                | ✅                                                                                                                                |
| `.6` Cancel closes the picker                      | `ProgramPickerDialog.test.tsx`                                                                | —                                                                                                                                 |
| `.7` Enrol opens, titled with the program          | `ProgramPickerDialog.test.tsx`, `EnrolmentModal.test.tsx`                                     | ✅ "Demo Program"                                                                                                                 |
| `.8` enrolled now                                  | `EnrolmentModal.test.tsx`                                                                     | ✅ today's date                                                                                                                   |
| `.9` this store recorded, nothing else seeded      | `EnrolmentModal.test.tsx`                                                                     | —                                                                                                                                 |
| `.10` the program's own form                       | `src/plugins/DocumentFormRegion.test.tsx` (resolution)                                        | ✅ the demo form                                                                                                                  |
| `.11` default form fields                          | — (unchanged; built with H6)                                                                  | —                                                                                                                                 |
| `.12` enrolment date changeable                    | — (the form library's date field)                                                             | —                                                                                                                                 |
| `.13` an emptied date restores itself              | — (the shared date field's own behaviour)                                                     | ✅ emptied, then Tab: "14 Oct 2026" again; Save sent it                                                                           |
| `.14` save closes, row appears                     | —                                                                                             | ✅ "Demo Program · GRY-0002 · · 14/10/2026"                                                                                       |
| `.15` default form's note round-trips              | —                                                                                             | —                                                                                                                                 |
| `.16` untouched closes without asking              | `EnrolmentModal.test.tsx`, `EnrolmentIdField.test.tsx`, `documentForm.test.ts` (`fill`)       | ✅ no prompt after Cancel                                                                                                         |
| `.17` changed asks to discard                      | `EnrolmentModal.test.tsx`                                                                     | ✅                                                                                                                                |
| `.18` discard closes unsaved                       | `EnrolmentModal.test.tsx`                                                                     | ✅                                                                                                                                |
| `.19` declining keeps the entries                  | `EnrolmentModal.test.tsx`                                                                     | —                                                                                                                                 |
| `.20` already enrolled → notice, entries kept      | `createDocumentForm.saveGuards.test.tsx`, `EnrolmentModal.test.tsx`                           | ✅ "Failed to save program enrolment · Bad user input: ProgramEnrolmentExists", typed ID kept                                     |
| `.21` view-only → permission-denied modal          | `createDocumentForm.saveGuards.test.tsx`, `EnrolmentModal.test.tsx`                           | ✅ "Permission denied" over the open enrolment, no inline banner                                                                  |
| `.22` a row opens the newest version               | —                                                                                             | ✅                                                                                                                                |
| `.23` Save only once changed                       | — (`canSave`, built with H4)                                                                  | ✅                                                                                                                                |
| `.24` a saved change shows on the tab              | —                                                                                             | —                                                                                                                                 |
| `.25` still one enrolment per program              | — (the server's)                                                                              | —                                                                                                                                 |
| `.26` a save over a newer version is refused       | `createDocumentForm.saveGuards.test.tsx`, `EnrolmentModal.test.tsx`                           | ✅ banner; the other user's version still newest                                                                                  |
| `.27` reopening shows the newer version            | `createDocumentForm.saveGuards.test.tsx`                                                      | ✅ "OTHER-USER-1"                                                                                                                 |
| `.28` not found                                    | — (built with H8)                                                                             | —                                                                                                                                 |
| `.29` generated as a new enrolment opens           | `EnrolmentIdField.test.tsx`                                                                   | ✅ GRY-0001                                                                                                                       |
| `.30` Generate asks first; declining keeps         | `EnrolmentIdField.test.tsx`                                                                   | ✅ "Are you sure? · This will create a new ID and cannot be undone."                                                              |
| `.31` confirming replaces                          | `EnrolmentIdField.test.tsx`                                                                   | ✅ GRY-0002 → GRY-0003                                                                                                            |
| `.32` a number is never reused                     | — (the server's counter)                                                                      | ✅ cancelled GRY-0001, next open GRY-0002                                                                                         |
| `.33` typing where allowed                         | `EnrolmentIdField.test.tsx`                                                                   | ✅                                                                                                                                |
| `.34` read-only where not                          | `EnrolmentIdField.test.tsx`                                                                   | — (the demo allows typing)                                                                                                        |
| `.35` a held generated ID is skipped               | `enrolmentId.test.ts`, `EnrolmentIdField.test.tsx`                                            | —                                                                                                                                 |
| `.36` a typed duplicate is flagged, any program    | `enrolmentId.test.ts`, `EnrolmentIdField.test.tsx`                                            | ✅ "Duplicated ID: WIRE-DUP-1", held in another program                                                                           |
| `.37` a flagged ID blocks the save                 | `EnrolmentIdField.test.tsx`, `createDocumentForm.saveGuards.test.tsx`, `documentForm.test.ts` | ✅ refused, "Enrolment ID: Duplicated ID: WIRE-DUP-1" in the summary; a pause on `GRY-000` then `GRY-0005` refused, nothing saved |
| `.51` a save mid-check waits for the check         | `EnrolmentIdField.test.tsx`, `createDocumentForm.saveGuards.test.tsx`                         | ✅ Save pressed straight after typing `GRY-0005`: waited, then refused                                                            |
| `.52` the not-installed notice, no Save            | `EnrolmentModal.test.tsx`                                                                     | ✅ HIV Care (rspec): "…The program also asks for: Status.", no Save, no error summary; an open-schema program keeps its Save      |
| `.53` Vaccinations tab: immunisation programs only | `programEnrolmentApi.test.ts`                                                                 | ✅ E2E Immunisation · Rspec Immunisation (Programs tab: all six)                                                                  |
| `.54` surrounding spaces dropped                   | `EnrolmentIdField.test.tsx`                                                                   | ✅ `" CARD 890 5 "` saved as `CARD 890 5`                                                                                         |
| `.55` duplicates ignore case                       | `enrolmentId.test.ts`                                                                         | ✅ `" gry-0005 "` flagged; `GRY-00051` not                                                                                        |
| `.38` its own ID is not a duplicate                | `enrolmentId.test.ts`                                                                         | —                                                                                                                                 |
| `.39` default form: typed ID, no Generate          | — (unchanged)                                                                                 | —                                                                                                                                 |
| `.40`–`.50` status history and closing             | pending #1491                                                                                 | —                                                                                                                                 |

The unit tests mock the GraphQL edge. The real-backend half is the deterministic suite below.

## Gaps closed after the first exploratory run (2026-10-15)

The run ([`exploratory/workflows/program-enrolment.md`](../../../exploratory/workflows/program-enrolment.md), 2026-10-14) raised two findings and five gap candidates. Decisions are in [the spec README's decisions 7–10](../../../spec/program-enrolment/README.md#status).

- **`ENR-20261014-F1`, `.13` unreachable:** reworded. A required date restores itself when emptied, so the case now says that.
- **`ENR-20261014-F2`, the default form's dead end:** `EnrolmentModal` validates the draft against the registry's schema. When no plugin form is contributed and a `required` failure falls outside the default form's fields, the enrolment shows the not-installed notice (`enrolment-form-missing`, `messages.enrolment-form-not-installed`), and offers neither Save nor the error summary.
- **Trimming and case:** the ID field keeps the box as typed but writes the trimmed ID (the typed text shows only while it still stands for the held ID). The duplicate check queries `like` and keeps exact matches ignoring case and spaces; any other holder counts, not just the first.
- **The Vaccinations tab's picker:** a new `immunisationProgramContexts` read (`programs(filter: { isImmunisation: true })`), with `programsToOffer` narrowing the picker by context.
  - **Server:** `ProgramNode.contextId` added (`server/graphql/types/src/types/program/program_node.rs`, re-exported to `server/schema.graphql`). Program and context ids differ in real data, as in the e2e datafile's `e2e_prog_imm_epi` / `e2e_ctx_imm_epi`.
- **Left on purpose:** status words as stored (with #1491), and the generic permission-denied message (the app-wide modal).
- **Also:** the patients workflow no longer calls a Programs row a no-op, and `spec/PROGRESS.md` ticks the Workflow cell.

## The deterministic suite (#1492, 2026-10-15)

[`e2e/specs/program-enrolment-regression.spec.ts`](../../../e2e/specs/program-enrolment-regression.spec.ts), run with `pnpm e2e:local program-enrolment-regression`: 21 tests covering every anchor in `.1`–`.42` and `.51`–`.55` except `.4`, all passing.

- **Fixtures** ([`server/data/e2e/README.md`](../../../../server/data/e2e/README.md)): the `ENRL` clinic (a dispensary with the program module on) and five enrolment registries. They are named so that name order differs from id order, so the picker's sort can be seen. Patients and enrolments are made per test over the API.
- **The ID programs' form** is a plugin the suite serves itself, per page, by answering plugin discovery and the bundle request. Nothing is installed on the server, and each test gets its own ID format and number counter.
- **Out of scope:**
  - `.4`, covered by `ProgramPickerDialog.test.tsx`;
  - `.43`–`.50`, pending #1491.
- **A finding, resolved in the spec:** `.28` said a not-found enrolment has no Save; the app keeps Save, disabled. The app's other editors with a not-found state do the same (the immunisation course editor, the patient Details tab), so `.28` was reworded (`ENR-20261015-F3`, spec README decision 11).
- **Test ids added:** `dialog-button-cancel` on the picker's and the enrolment's Cancel, plus `enrolment-form-missing` and the suite's own `e2e-enrolment-plugin-form`, all in [`e2e/TESTIDS.md`](../../../e2e/TESTIDS.md).
- **Checks:**
  - Each test was made to fail once on purpose: 22 out of 22 went red at the assertion that was changed.
  - The only expectation that moved after a run was the date field's format. It shows the entry format `DD MMM YYYY`, per ui-standards › inputs, not the table's `DD/MM/YYYY`. That was a mistake in how I wrote the test, not an app bug.

## Left for later

- **Product re-check of generate-on-open** (decided 2026-10-14, [spec README § status](../../../spec/program-enrolment/README.md#status)). Every opened new enrolment draws a counter number, cancelled or not. The live run spent GRY-0001 that way.
- **Djibouti's own enrolment ID field** (`EnrolmentIdField.tsx` on `custom-forms/misc-open-tasks`, not on this base) should move onto the host field when that branch lands.
- **#1491**: status history through the form library's list control (#1148), and closing.

## Probe residue

On the throwaway copy behind port 8196 (`server/rspec_890.sqlite` in this worktree, gitignored):

- the `DemoProgram` context, program, registry entry `live890_reg_demo_enrol` and two `live890-DemoProgram-*` permission rows;
- patients `live-890-a` … `d` and their Demo Program enrolments;
- the `PROGRAM_DemoProgramEnrolment` counter.
