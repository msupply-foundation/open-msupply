import { describe, expect, it } from 'vitest';
import { definePlugin } from './definePlugin';
import { PLUGIN_API_VERSION } from './apiVersion';
import type {
  EncounterFormProps,
  PatientFormProps,
  ProgramEnrolmentFormProps,
} from './types';
import type { Encounter, Patient, ProgramEnrolment } from './documents';

/*
 * A plugin's document type may narrow the base type it extends, as a
 * deployment's often does (a patient code it always issues, an enrolment id
 * it requires). A form written against that narrower type has to be
 * contributable to its slot without a cast. This file is the check: it is
 * type-checked with the app (`tsc -b`, in `pnpm check`), and a slot type that
 * refused these forms would fail it there.
 */

interface IssuedCodePatient extends Patient {
  code: string;
}
interface NumberedEnrolment extends ProgramEnrolment {
  programEnrolmentId: string;
}
interface StatusedEncounter extends Encounter {
  status: NonNullable<Encounter['status']>;
}

// Only the type of each form's props matters here.
const PatientForm = (_props: PatientFormProps<IssuedCodePatient>) => null;
const EnrolmentForm = (_props: ProgramEnrolmentFormProps<NumberedEnrolment>) =>
  null;
const EncounterForm = (_props: EncounterFormProps<StatusedEncounter>) => null;

describe('document form slots', () => {
  it('take a form written against a narrower document type', () => {
    const plugin = definePlugin({
      manifest: {
        code: 'narrowed',
        version: '1.0.0',
        pluginApiVersion: PLUGIN_API_VERSION,
      },
      contributions: [
        {
          slot: 'patient.form',
          id: 'patient',
          documentType: 'Patient',
          Component: PatientForm,
          archived: { 1: PatientForm },
        },
        {
          slot: 'programEnrolment.form',
          id: 'enrolment',
          documentType: 'NumberedEnrolment',
          Component: EnrolmentForm,
        },
        {
          slot: 'encounter.form',
          id: 'encounter',
          documentType: 'StatusedEncounter',
          Component: EncounterForm,
        },
      ],
    });
    expect(plugin.contributions).toHaveLength(3);
  });
});
