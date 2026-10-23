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

const textFieldProps = vi.fn();
vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: (p: { label: string }) => {
    textFieldProps(p);
    return p.label;
  },
}));
const codeControlProps = vi.fn();
vi.mock('./PatientControls', () => {
  const echo = (p: { label?: string }) => p.label;
  return {
    PatientCodeControl: (p: { label?: string }) => {
      codeControlProps(p);
      return p.label;
    },
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

// Remaining work item 17: the code field hands its control the schema's
// pattern, which leaves Generate out where generated codes cannot match it.
describe("the host's code field", () => {
  it("passes the schema's pattern for the code to its control", () => {
    const patterned = {
      ...draft,
      schemaFor: (path: string) =>
        path === 'code'
          ? { required: false, pattern: '^[0-9]{6}$' }
          : undefined,
    } as unknown as Draft<Patient>;
    createRoot(dispose => {
      const out = <PatientCodeField draft={patterned} />;
      dispose();
      return out;
    });
    expect(codeControlProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ pattern: '^[0-9]{6}$', required: false })
    );
  });
});

// A required name cleared must fail the schema's required, which an empty
// string would pass under `type: string`: the field removes the property, as
// the form library's text fields do.
describe("the host's name fields", () => {
  it.each([
    ['first name', PatientFirstNameField, 'firstName'],
    ['last name', PatientLastNameField, 'lastName'],
  ] as const)('remove the %s when it is cleared', (_name, Field, path) => {
    const set = vi.fn();
    const editable = { ...draft, set } as unknown as Draft<Patient>;
    textFieldProps.mockClear();
    createRoot(dispose => {
      const out = <Field draft={editable} />;
      dispose();
      return out;
    });
    const props = textFieldProps.mock.lastCall?.[0] as {
      onInput: (e: { currentTarget: { value: string } }) => void;
    };
    props.onInput({ currentTarget: { value: '' } });
    expect(set).toHaveBeenLastCalledWith(path, undefined);
    props.onInput({ currentTarget: { value: 'Ali' } });
    expect(set).toHaveBeenLastCalledWith(path, 'Ali');
  });
});
