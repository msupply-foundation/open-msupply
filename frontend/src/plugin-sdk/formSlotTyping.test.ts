/* eslint-disable solid/reactivity -- the inline forms are type-checked, never rendered */
import { describe, expect, it } from 'vitest';
import { definePlugin } from './definePlugin';
import { PLUGIN_API_VERSION } from './apiVersion';
import { encounterForm, enrolmentForm, patientForm } from './forms';
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
 * contributable to its slot without a cast, and a form for another category,
 * or one reading a path its type does not have, must not be. This file is the
 * check: it is type-checked with the app (`tsc -b`, in `pnpm check`), so a
 * slot type that refused the first forms, or took the others (each marked
 * `@ts-expect-error`), fails it there.
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

const manifest = {
  code: 'narrowed',
  version: '1.0.0',
  pluginApiVersion: PLUGIN_API_VERSION,
};

describe('document form slots', () => {
  it('take a form written against a narrower document type', () => {
    const plugin = definePlugin({
      manifest,
      contributions: [
        {
          slot: 'patient.form',
          id: 'patient',
          documentType: 'Patient',
          versions: ['Patient_v1'],
          Component: patientForm(PatientForm),
          archived: { 1: patientForm(PatientForm) },
        },
        {
          slot: 'programEnrolment.form',
          id: 'enrolment',
          documentType: 'NumberedEnrolment',
          versions: ['NumberedEnrolment_v1'],
          Component: enrolmentForm(EnrolmentForm),
        },
        {
          slot: 'encounter.form',
          id: 'encounter',
          documentType: 'StatusedEncounter',
          versions: ['StatusedEncounter_v1'],
          Component: encounterForm(EncounterForm),
        },
      ],
    });
    expect(plugin.contributions).toHaveLength(3);
  });

  it('refuse a form for another category, or one its helper did not make', () => {
    // @ts-expect-error an encounter form is not a patient form
    patientForm(EncounterForm);
    // @ts-expect-error a patient form is not an enrolment form
    enrolmentForm(PatientForm);
    const plugin = definePlugin({
      manifest,
      contributions: [
        {
          slot: 'patient.form',
          id: 'patient',
          documentType: 'Patient',
          versions: ['Patient_v1'],
          // @ts-expect-error an encounter slot's form, in the patient slot
          Component: encounterForm(EncounterForm),
        },
        {
          slot: 'encounter.form',
          id: 'encounter',
          documentType: 'StatusedEncounter',
          versions: ['StatusedEncounter_v1'],
          // @ts-expect-error a bare component, not made by the slot's helper
          Component: EncounterForm,
        },
      ],
    });
    expect(plugin.contributions).toHaveLength(2);
  });

  it('refuse a form that declares no versions', () => {
    const plugin = definePlugin({
      manifest,
      contributions: [
        // @ts-expect-error every form lists its type's versions, one or more
        {
          slot: 'encounter.form',
          id: 'encounter',
          documentType: 'StatusedEncounter',
          Component: encounterForm(EncounterForm),
        },
      ],
    });
    expect(plugin.contributions).toHaveLength(1);
  });

  it("check an inline form's paths against the slot's base type", () => {
    patientForm(props => {
      // @ts-expect-error `notAPatientField` is not a path of the base Patient
      props.draft.set('notAPatientField', 'x');
      return null;
    });
    // @ts-expect-error nor is it a property of its data
    patientForm(props => props.draft.data.notAPatientField);
    expect(patientForm(props => props.draft.get('firstName'))).toBeTypeOf(
      'function'
    );
  });
});
