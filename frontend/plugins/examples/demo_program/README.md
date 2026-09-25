# `demo_program` — the custom-forms demo program

The reference **form plugin**: one small program, modelled on an HIV care program, that exercises the custom-forms mechanism end to end ([`kdd/custom-forms/implementation-plan.md` § The demo program](../../../kdd/custom-forms/implementation-plan.md#the-demo-program-agreed-as-a-starting-point)). Plugin code `demo_program`, program key `demo`. It lives under `examples/`, so no deployment receives it. How form plugins work in general is [`plugins/README.md` § Form plugins](../../README.md#form-plugins).

## What it owns

| Document type          | Category         | Program key | Versions | Adds under `extension.demo`                                      |
| ---------------------- | ---------------- | ----------- | -------- | ---------------------------------------------------------------- |
| `Patient`              | Patient          | none        | v1       | `occupation`, `preferredLanguage`                                |
| `DemoProgramEnrolment` | ProgramEnrolment | `demo`      | v1       | `referredFrom`, `enrolmentNotes`                                 |
| `DemoEncounter`        | Encounter        | `demo`      | v1, v2   | `vitals.{ weightKg, heightCm }`, `regimen`, `nextVisit`, `notes` |

`DemoEncounter` carries a breaking change between its versions. v1 ([`forms/DemoEncounter/v1.ts`](forms/DemoEncounter/v1.ts), the archived type `DemoEncounterV1`) stored weight and height flat under `extension.demo` and allowed the regimen `LEGACY_TRIAL`. v2 ([`forms/DemoEncounter/type.ts`](forms/DemoEncounter/type.ts)) moves them under `vitals` and retires that value. `v1.json` is frozen; only `v2.json` is regenerated from its type.

Its event rules ([`forms/DemoEncounter/events.json`](forms/DemoEncounter/events.json)) all write to the enrolment:

- a Field rule copying `extension.demo.regimen` into a `currentRegimen` event;
- two Schedule rules from `extension.demo.nextVisit`, producing a `followUpStatus` event of "Due" at 0 days and "Overdue" at 30 days.

## Its forms

`plugin.tsx` contributes a form for each program type, beside that type's schema versions:

- **Enrolment** ([`forms/DemoProgramEnrolment/form.tsx`](forms/DemoProgramEnrolment/form.tsx)), the body of the enrolment modal for `DemoProgramEnrolment`: the enrolment date; the enrolment ID with a Generate button, which builds `GRY-0001` from the store code and the server counter `DemoProgramEnrolment` and asks before replacing an ID already there; where the patient was referred from; notes; and the patient's current regimen and follow-up status, read-only from the program events the encounters' rules write.
- **Encounter** ([`forms/DemoEncounter/form.tsx`](forms/DemoEncounter/form.tsx)), the body of the encounter record screen for `DemoEncounter`: weight and height with the BMI worked out from them, the regimen, the next visit and notes. The screen's toolbar holds the visit date, clinician and status.

Saving an encounter with a regimen and a next visit gives the enrolment a `currentRegimen` event at once, and a `followUpStatus` of Due from the next-visit day (Overdue 30 days after). A next visit in the future therefore shows no follow-up status until that day.

The patient field group, the patient code override and the follow-up trigger join as their host slots are built (plan items P2, H9, H9b, H10b).

## Running it

```bash
pnpm forms:emit        # re-emit v2 (and any missing frozen version) after editing a type
pnpm forms:check       # what `pnpm check` runs: fails if a committed schema is stale
pnpm build:plugins     # emits, then packs dist/bundles/demo_program.json with its form_plugins
```

Install it on a dev server, choosing the program for the `demo` key and taking over the server's existing `Patient` entry:

```bash
OMS_USERNAME=<user> OMS_PASSWORD=<pass> pnpm plugin:install plugins/examples/demo_program \
  --program demo=DemoProgram --take-over Patient
```

`DemoProgram` is the program id [`kdd/custom-forms/demo-program-seed.sql`](../../../kdd/custom-forms/demo-program-seed.sql) seeds. Serve the browser half from source with `OMS_PLUGIN_DIRS=plugins/examples/demo_program pnpm dev`.
