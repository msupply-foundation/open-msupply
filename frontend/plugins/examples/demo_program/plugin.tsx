/*
 * The custom-forms demo program (kdd/custom-forms/implementation-plan.md
 * § The demo program): a form plugin whose document types, schema versions
 * and event rules live under `forms/`, declared in `forms/forms.json`.
 *
 * The module declares its identity, the forms for its enrolment and encounter
 * types, and the plugin's translations. Each form is contributed to its
 * category's slot under the document type it renders, so the host shows it
 * wherever a document of that type opens.
 *
 * The encounter's contribution also carries the type's versioning: every
 * schema id (generated into `versions.ts`), the migration from v1 to v2, and
 * the archived v1 form, which the host shows read-only for encounters
 * recorded under v1 until the user presses Edit.
 *
 * TO-DO: contribute the patient field group, the patient code override and
 * the follow-up trigger (plan item P2) once their host slots exist (H9, H9b,
 * H10b, chunk 6).
 *
 * The identity is read from `./package.json`, the manifest the pack step and
 * the server's install gate read, so the module and its bundle cannot
 * disagree.
 */
import { PLUGIN_API_VERSION, definePlugin } from '@openmsupply/plugin-sdk';
import { name, version } from './package.json';
import { DemoEnrolmentForm } from './forms/DemoProgramEnrolment/form';
import { DemoEncounterForm } from './forms/DemoEncounter/form';
import { DemoEncounterV1Form } from './forms/DemoEncounter/v1Form';
import { migrations as encounterMigrations } from './forms/DemoEncounter/migrations';
import { versions as encounterVersions } from './forms/DemoEncounter/versions';

export default definePlugin({
  manifest: {
    code: name,
    version,
    pluginApiVersion: PLUGIN_API_VERSION,
  },
  contributions: [
    {
      slot: 'programEnrolment.form',
      id: 'enrolment-form',
      documentType: 'DemoProgramEnrolment',
      Component: DemoEnrolmentForm,
    },
    {
      slot: 'encounter.form',
      id: 'encounter-form',
      documentType: 'DemoEncounter',
      Component: DemoEncounterForm,
      versions: encounterVersions,
      migrations: encounterMigrations,
      archived: { 1: DemoEncounterV1Form },
    },
  ],
  translations: {
    en: {
      // The display names of the program and its document types, keyed as
      // `forms/forms.json` names them.
      'program.demo': 'Demo Program',
      'documentType.Patient': 'Patient',
      'documentType.DemoProgramEnrolment': 'Demo Program',
      'documentType.DemoEncounter': 'Demo follow-up',

      // The enrolment form.
      'group.enrolment': 'Enrolment',
      'field.enrolment-date': 'Enrolment date',
      'field.enrolment-id': 'Enrolment ID',
      'button.generate': 'Generate',
      'heading.replace-enrolment-id': 'Replace the enrolment ID?',
      'message.replace-enrolment-id':
        'This enrolment already has the ID {{ id }}. Generating a new one replaces it, and {{ id }} is not issued again.',
      'button.replace': 'Replace',
      'field.referred-from': 'Referred from',
      'referral.SELF': 'Self-referred',
      'referral.CLINIC': 'Clinic',
      'referral.HOSPITAL': 'Hospital',
      'referral.COMMUNITY': 'Community outreach',
      'field.enrolment-notes': 'Enrolment notes',
      'group.program-status': 'Program status',
      'field.current-regimen': 'Current regimen',
      'field.follow-up-status': 'Follow-up status',
      'helper.from-encounters': "Set from the patient's encounters",
      'follow-up.Due': 'Due',
      'follow-up.Overdue': 'Overdue',

      // The encounter form.
      'group.vitals': 'Vitals',
      'field.weight': 'Weight',
      'field.height': 'Height',
      'unit.kg': 'kg',
      'unit.cm': 'cm',
      'field.bmi': 'BMI',
      'group.treatment': 'Treatment',
      'field.regimen': 'Regimen',
      'regimen.FIRST_LINE': 'First line',
      'regimen.SECOND_LINE': 'Second line',
      'field.next-visit': 'Next visit',
      'helper.next-visit':
        'The follow-up status is Due from this day, and Overdue 30 days after',
      'group.notes': 'Notes',
      'field.visit-notes': 'Visit notes',

      // The archived v1 encounter form, and what its migration keeps.
      'group.visit': 'Visit',
      'regimen.LEGACY_TRIAL': 'Legacy trial',
      'field.adherence': 'Adherence notes',
      'kept.adherence': 'Adherence notes',
    },
  },
});
