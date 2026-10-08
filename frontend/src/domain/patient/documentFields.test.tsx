import { describe, expect, it, vi } from 'vitest';
import { createRoot, type JSX } from 'solid-js';
import type { Draft } from '../documentForm/draft';
import type { Patient } from '../../plugin-sdk/documents';

/*
 * A plugin's wording for the host's patient fields (sdk-contract § the
 * document form slots, the host's patient fields): each field with one label
 * shows the plugin's `label` when given and the host's own otherwise. The
 * leaf controls are stand-ins that render their label, so this runs without a
 * DOM (vitest.workspace.ts, the solid project); a control given no label
 * falls back to the host's own inside itself.
 */

vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: (p: { label: string }) => p.label,
}));
vi.mock('./PatientControls', () => {
  const echo = (p: { label?: string }) => p.label;
  return {
    PatientCodeControl: echo,
    DateOfBirthControl: echo,
    GenderControl: echo,
    NextOfKinControl: echo,
    DeceasedControls: echo,
  };
});
vi.mock('../../store/storeContext', () => ({
  currentStoreId: () => 'store-a',
}));

import {
  PatientAddressField,
  PatientCode2Field,
  PatientCodeField,
  PatientDateOfBirthField,
  PatientFirstNameField,
  PatientGenderField,
  PatientLastNameField,
  PatientNextOfKinField,
  PatientPhoneField,
  type LabelledPatientFieldProps,
} from './documentFields';

const draft = {
  data: { id: 'patient-1', firstName: 'Amina', lastName: 'Ali' },
  get: () => undefined,
  set: () => {},
  schemaFor: () => undefined,
  errorFor: () => undefined,
  unresolved: () => undefined,
  readOnly: () => false,
} as unknown as Draft<Patient>;

const render = (
  Field: (props: LabelledPatientFieldProps) => JSX.Element,
  label?: string
): unknown =>
  createRoot(dispose => {
    const out = <Field draft={draft} label={label} />;
    dispose();
    return out;
  });

// Each field, and the host label it shows with none given: a catalogue key,
// since no catalogue is loaded here; undefined where the field hands the
// choice to its control.
const fields: [
  string,
  (props: LabelledPatientFieldProps) => JSX.Element,
  string | undefined,
][] = [
  ['code', PatientCodeField, undefined],
  ['code2', PatientCode2Field, 'label.code2'],
  ['first name', PatientFirstNameField, 'label.first-name'],
  ['last name', PatientLastNameField, 'label.last-name'],
  ['date of birth', PatientDateOfBirthField, undefined],
  ['gender', PatientGenderField, undefined],
  ['address', PatientAddressField, 'label.address'],
  ['phone', PatientPhoneField, 'label.phone'],
  ['next of kin', PatientNextOfKinField, undefined],
];

describe("the host's patient fields", () => {
  it.each(fields)("show the plugin's label for %s", (_name, Field) => {
    expect(render(Field, '2ème nom')).toBe('2ème nom');
  });

  it.each(fields)(
    "keep the host's label for %s when given none",
    (_name, Field, host) => {
      expect(render(Field)).toBe(host);
    }
  );
});
