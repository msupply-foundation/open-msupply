/*
 * The custom-forms demo program (kdd/custom-forms/implementation-plan.md
 * § The demo program): a form plugin whose document types, schema versions
 * and event rules live under `forms/`, declared in `forms/forms.json`.
 *
 * The module declares its identity, the forms for its patient, enrolment and
 * encounter types, a trigger on the patient screen, and the plugin's
 * translations. Each form is contributed to its category's slot under the
 * document type it renders, so the host shows it wherever a document of that
 * type opens: the patient form as the patient screen's Details tab.
 *
 * The encounter's contribution also carries the type's versioning: every
 * schema id (generated into `versions.ts`), the migration from v1 to v2, and
 * the archived v1 form, which the host shows read-only for encounters
 * recorded under v1 until the user presses Edit.
 *
 * `VaccinationEncounter` is a deployed type the plugin took over, with
 * its deployment's schema as v1 and an additive v2: its contribution lists
 * the versions and nothing else, since an additive change needs no migration
 * and its earlier documents open in the current form.
 *
 * The "Record follow-up" trigger sits on the header of patients enrolled in
 * the program and opens a new `DemoEncounter` in the host's modal, the same
 * encounter form the encounter's own screen shows.
 *
 * The identity is read from `./package.json`, the manifest the pack step and
 * the server's install gate read, so the module and its bundle cannot
 * disagree.
 */
import {
  PLUGIN_API_VERSION,
  PlusCircleIcon,
  definePlugin,
  encounterForm,
  enrolmentForm,
  patientForm,
} from '@openmsupply/plugin-sdk';
import { name, version } from './package.json';
import { DemoPatientForm } from './forms/Patient/form';
import { versions as patientVersions } from './forms/Patient/versions';
import { DemoEnrolmentForm } from './forms/DemoProgramEnrolment/form';
import { DemoEncounterForm } from './forms/DemoEncounter/form';
import { DemoEncounterV1Form } from './forms/DemoEncounter/v1Form';
import { migrations as encounterMigrations } from './forms/DemoEncounter/migrations';
import { versions as encounterVersions } from './forms/DemoEncounter/versions';
import { VaccinationEncounterForm } from './forms/VaccinationEncounter/form';
import { versions as vaccinationEncounterVersions } from './forms/VaccinationEncounter/versions';

export default definePlugin({
  manifest: {
    code: name,
    version,
    pluginApiVersion: PLUGIN_API_VERSION,
  },
  contributions: [
    {
      slot: 'patient.form',
      id: 'patient-form',
      documentType: 'Patient',
      Component: patientForm(DemoPatientForm),
      versions: patientVersions,
    },
    {
      slot: 'patient.toolbarTrigger',
      id: 'record-follow-up',
      label: 'button.record-follow-up',
      icon: PlusCircleIcon,
      visible: ({ patient }) =>
        patient.enrolmentTypes.includes('DemoProgramEnrolment'),
      onClick: (_props, { openDocumentForm }) =>
        openDocumentForm({ documentType: 'DemoEncounter' }),
    },
    {
      slot: 'programEnrolment.form',
      id: 'enrolment-form',
      documentType: 'DemoProgramEnrolment',
      Component: enrolmentForm(DemoEnrolmentForm),
    },
    {
      slot: 'encounter.form',
      id: 'encounter-form',
      documentType: 'DemoEncounter',
      Component: encounterForm(DemoEncounterForm),
      versions: encounterVersions,
      migrations: encounterMigrations,
      archived: { 1: encounterForm(DemoEncounterV1Form) },
    },
    {
      slot: 'encounter.form',
      id: 'vaccination-encounter-form',
      documentType: 'VaccinationEncounter',
      Component: encounterForm(VaccinationEncounterForm),
      versions: vaccinationEncounterVersions,
    },
  ],
  translations: {
    en: {
      // The patient form, and the trigger on the patient screen.
      'group.patient-details': 'Patient details',
      'group.contact': 'Contact',
      'group.status': 'Status',
      'field.patient-code': 'Patient code',
      'button.generate': 'Generate',
      'button.replace': 'Replace',
      'heading.replace-patient-code': 'Replace the patient code?',
      'message.replace-patient-code':
        'This patient already has the code {{ code }}. Generating a new one replaces it and uses up the next number.',
      'group.demo-details': 'Demo Program',
      'field.treatment-supporter': 'Treatment supporter',
      'field.preferred-language': 'Preferred language',
      'language.ENGLISH': 'English',
      'language.FRENCH': 'French',
      'language.SPANISH': 'Spanish',
      'language.OTHER': 'Other',
      'button.record-follow-up': 'Record follow-up',

      // The enrolment form.
      'group.enrolment': 'Enrolment',
      'field.enrolment-date': 'Enrolment date',
      'field.enrolment-id': 'Enrolment ID',
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

      // The vaccination encounter, taken over from a deployment.
      'group.vaccination-services': 'Vaccination services',
      'field.offered-vaccination': 'Client offered vaccination',
      'field.declined': 'Declined',
      'field.reason-for-decline': 'Reason for decline',
      'group.vaccination-event': 'Vaccination event',
      'field.vaccination-date': 'Vaccination date',
      'field.manufacturer': 'Manufacturer',
      'manufacturer.other': 'Other',
      'field.batch-number': 'Batch number',
    },
  },
});
