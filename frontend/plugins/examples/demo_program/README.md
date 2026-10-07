# `demo_program` — the custom-forms demo program

The reference **form plugin**: one small program, modelled on an HIV care program, that exercises the custom-forms mechanism end to end ([`kdd/custom-forms/implementation-plan.md` § The demo program](../../../kdd/custom-forms/implementation-plan.md#the-demo-program-agreed-as-a-starting-point)). Plugin code `demo_program`, program key `demo`. It lives under `examples/`, so no deployment receives it. How form plugins work in general is [`plugins/README.md` § Form plugins](../../README.md#form-plugins).

## What it owns

| Document type          | Category         | Program key | Versions                | Its own fields                                                                                                                                                                      |
| ---------------------- | ---------------- | ----------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Patient`              | Patient          | none        | v1                      | under `extension.demo`: `treatmentSupporter`, `preferredLanguage`                                                                                                                   |
| `DemoProgramEnrolment` | ProgramEnrolment | `demo`      | v1                      | under `extension.demo`: `referredFrom`, `enrolmentNotes`                                                                                                                            |
| `DemoEncounter`        | Encounter        | `demo`      | v1, v2                  | under `extension.demo`: `vitals.{ weightKg, heightCm }`, `regimen`, `nextVisit`, `notes`                                                                                            |
| `VaccinationEncounter` | Encounter        | `demo`      | v1 (a deployment's), v2 | under `extension`, as deployed: `clientOfferedVaccination`, `declined`, `reasonForDecline`, `vaccinationDate`, `manufacturer`; v2 adds `batchNumber` and the manufacturer `Novavax` |

`DemoEncounter` carries a breaking change between its versions. v1 ([`forms/DemoEncounter/v1.ts`](forms/DemoEncounter/v1.ts), the archived type `DemoEncounterV1`) stored weight and height flat under `extension.demo`, allowed the regimen `LEGACY_TRIAL`, and had adherence notes. v2 ([`forms/DemoEncounter/type.ts`](forms/DemoEncounter/type.ts)) moves the vitals under `vitals`, retires that value and removes the notes field. `v1.json` is frozen; only `v2.json` is regenerated from its type.

The migration ([`forms/DemoEncounter/migrations.ts`](forms/DemoEncounter/migrations.ts)) covers all three differences: the vitals are moved, a `LEGACY_TRIAL` regimen is unresolved (cleared and shown as previously recorded, under its v1 label "Legacy trial", until a current regimen is chosen), and the adherence notes are kept (left in the document and listed read-only after the form). [`fixtures/v1.json`](forms/DemoEncounter/fixtures/v1.json) is the v1 encounter the build migrates and validates.

Its event rules ([`forms/DemoEncounter/events.json`](forms/DemoEncounter/events.json)) all write to the enrolment:

- a Field rule copying `extension.demo.regimen` into a `currentRegimen` event;
- two Schedule rules from `extension.demo.nextVisit`, producing a `followUpStatus` event of "Due" at 0 days and "Overdue" at 30 days.

`VaccinationEncounter` is a deployed type the plugin takes over: an illustrative deployment's vaccination encounter, by the recipe in [`plugins/README.md` § Form plugins](../../README.md#form-plugins). [`forms/VaccinationEncounter/type.ts`](forms/VaccinationEncounter/type.ts) is the deployment's own type file with the base type imported from the SDK and the enum written as a union. Its v1 is the deployment's schema exactly (the type regenerated it), declared in `forms/forms.json` under the deployment's schema id, so documents saved before the take-over keep their version. [`legacy-ui.json`](forms/VaccinationEncounter/legacy-ui.json) is the deployment's JSON Forms UI schema, verbatim, for sites still on the old client; install writes it to the type's versions, and nothing in the plugin reads it. v2 is additive, with no migration, so v1 documents open in the current form as they are; the old client lists `Novavax` (from the schema) but shows no batch number, which its saves keep. [`fixtures/v1.json`](forms/VaccinationEncounter/fixtures/v1.json) is a document the old client wrote at v1, which the build checks validates unchanged against v2.

## Its forms

`plugin.tsx` contributes a form for each of its types, beside that type's schema versions, and a trigger:

- **Patient** ([`forms/Patient/form.tsx`](forms/Patient/form.tsx)), the body of the patient screen's Details tab: the host's patient fields (names, date of birth with age, gender, address, phone, next of kin, deceased) composed with the program's own. In place of the host's code field it renders its own, whose Generate button builds `GRY-K7Q-0001` from the store code, three random characters and the server counter `DemoPatientCode` ([`forms/Patient/patientCode.ts`](forms/Patient/patientCode.ts)), asks before replacing a code, and shows only with the document-mutate permission; after the date of birth, a Demo Program group with the treatment supporter and preferred language. The host checks the code against other patients when the patient is saved.

- **Enrolment** ([`forms/DemoProgramEnrolment/form.tsx`](forms/DemoProgramEnrolment/form.tsx)), the body of the enrolment modal for `DemoProgramEnrolment`: the enrolment date; the enrolment ID with a Generate button, which builds `GRY-0001` from the store code and the server counter `DemoProgramEnrolment` and asks before replacing an ID already there; where the patient was referred from; notes; and the patient's current regimen and follow-up status, read-only from the program events the encounters' rules write.
- **Encounter** ([`forms/DemoEncounter/form.tsx`](forms/DemoEncounter/form.tsx)), the body of the encounter record screen for `DemoEncounter`: weight and height with the BMI worked out from them, the regimen, the next visit and notes. The screen's toolbar holds the visit date, clinician and status.
- **vaccination encounter** ([`forms/VaccinationEncounter/form.tsx`](forms/VaccinationEncounter/form.tsx)), the body of the encounter record screen for `VaccinationEncounter`, written from scratch: the old form's two groups (services: offered, declined and the reason, which can be entered only once declined is ticked; the vaccination event: date, manufacturer and batch number).
- **Archived v1 encounter** ([`forms/DemoEncounter/v1Form.tsx`](forms/DemoEncounter/v1Form.tsx)), the form as it was at v1: weight and height in one Visit group with the regimen (`Legacy trial` among its options), no BMI, and the adherence notes. The host shows it read-only for encounters recorded under v1; Edit migrates the encounter and opens the current form, and saving pins it to v2.

Saving an encounter with a regimen and a next visit gives the enrolment a `currentRegimen` event at once, and a `followUpStatus` of Due from the next-visit day (Overdue 30 days after). A next visit in the future therefore shows no follow-up status until that day.

- **Record follow-up**, a trigger on the patient screen's header for patients enrolled in the program, opens a new `DemoEncounter` in the host's modal: the visit date, clinician and status above the same encounter form the record screen shows. Saving records the encounter and refreshes the patient's encounters and enrolments.

## Running it

```bash
pnpm forms:emit        # re-emit v2 (and any missing frozen version) after editing a type
pnpm forms:check       # what `pnpm check` runs: fails if a committed schema or versions.ts is stale, or the versions do not fit together
pnpm build:plugins     # emits, checks the versions, then packs dist/bundles/demo_program.json with its form_plugins
```

Install it on a dev server, choosing the program for the `demo` key and taking over the server's existing `Patient` entry, and the vaccination encounter's where the server has one (on a server without it, install creates the entry). The demo's `Patient` type carries no legacy UI schema, so the old client's patient form goes blank after the take-over, and `--blank-old-ui Patient` says that is intended:

```bash
OMS_USERNAME=<user> OMS_PASSWORD=<pass> pnpm plugin:install plugins/examples/demo_program \
  --program demo=DemoProgram --take-over Patient --blank-old-ui Patient \
  --take-over VaccinationEncounter
```

`DemoProgram` is the program id [`kdd/custom-forms/demo-program-seed.sql`](../../../kdd/custom-forms/demo-program-seed.sql) seeds. Serve the browser half from source with `OMS_PLUGIN_DIRS=plugins/examples/demo_program pnpm dev`.
