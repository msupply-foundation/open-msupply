import type { Component } from 'solid-js';
import type { Encounter, Patient, ProgramEnrolment } from './documents';
import type {
  EncounterFormComponent,
  EncounterFormProps,
  EnrolmentFormComponent,
  PatientFormComponent,
  PatientFormProps,
  ProgramEnrolmentFormProps,
} from './types';

/*
 * The form slots' helpers (kdd/custom-forms/specs.md § Forms in the UI): each
 * takes a form written against the plugin's own document type and returns it
 * as its slot takes it. `T` is bounded by the slot's base type, so a form for
 * a narrower type passes, a form for another category does not, and an
 * inline component, with nothing to infer `T` from, has its paths checked
 * against the base type. Pure: each returns its argument; the host renders
 * it with a draft it has checked against the document type's schema.
 */

/**
 * A `patient.form` contribution's component:
 * `Component: patientForm(DemoPatientForm)`, where `DemoPatientForm` takes
 * `PatientFormProps<DemoPatient>`.
 */
export const patientForm = <T extends Patient = Patient>(
  component: Component<PatientFormProps<T>>
): PatientFormComponent => component as unknown as PatientFormComponent;

/** An `encounter.form` contribution's component. As {@link patientForm}. */
export const encounterForm = <T extends Encounter = Encounter>(
  component: Component<EncounterFormProps<T>>
): EncounterFormComponent => component as unknown as EncounterFormComponent;

/**
 * A `programEnrolment.form` contribution's component. As
 * {@link patientForm}.
 */
export const enrolmentForm = <T extends ProgramEnrolment = ProgramEnrolment>(
  component: Component<ProgramEnrolmentFormProps<T>>
): EnrolmentFormComponent => component as unknown as EnrolmentFormComponent;
