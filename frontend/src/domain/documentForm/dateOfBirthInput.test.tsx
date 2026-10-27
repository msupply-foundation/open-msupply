import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import type { Draft } from './draft';

/*
 * DateOfBirthInput over the host's date-of-birth control: what it hands the
 * control from the draft, and what it writes back for a date and for an age.
 * The control is a stand-in that records its props, so this runs without a
 * DOM (vitest.workspace.ts, the solid project).
 */

interface ControlProps {
  label?: string;
  value: string | null;
  estimated?: boolean;
  required?: boolean;
  disabled?: boolean;
  onChange: (dob: string | null, fromAge: boolean) => void;
}

// What the control was last given, read through a function so the compiler
// does not narrow it to the value the render began with.
const seen: { control?: ControlProps } = {};
const lastControl = (): ControlProps | undefined => seen.control;
vi.mock('../patient/PatientControls', () => ({
  DateOfBirthControl: (p: ControlProps) => {
    seen.control = p;
    return null;
  },
}));

// The other fields' inputs, which fields.tsx imports beside it: several
// register document events as they load, and there is no document.
vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: () => null,
}));
vi.mock('../../ui/elements/inputs/TextArea', () => ({ TextArea: () => null }));
vi.mock('../../ui/elements/inputs/NumberField', () => ({
  NumberField: () => null,
}));
vi.mock('../../ui/elements/inputs/DateField', () => ({
  DateField: () => null,
}));
vi.mock('../../ui/elements/inputs/DateTimeField', () => ({
  DateTimeField: () => null,
}));
vi.mock('../../ui/elements/inputs/Checkbox', () => ({ Checkbox: () => null }));
vi.mock('../../ui/elements/selectors/Select', () => ({ Select: () => null }));
vi.mock('../../ui/elements/selectors/Combobox', () => ({
  Combobox: () => null,
}));

import { DateOfBirthInput } from './fields';

interface Doc {
  history?: {
    dateOfLastBirth?: string;
    dateOfBirthIsEstimated?: boolean;
  };
}

const fakeDraft = (initial: Record<string, unknown>) => {
  const values = { ...initial };
  const draft = {
    get: (path: string) => values[path],
    set: (path: string, value: unknown) => {
      if (value === undefined) delete values[path];
      else values[path] = value;
    },
    schemaFor: () => ({ required: false }),
    errorFor: () => undefined,
    failedRule: () => undefined,
    readOnly: () => false,
  } as unknown as Draft<Doc>;
  return { draft, values };
};

const render = (draft: Draft<Doc>, withEstimated: boolean) =>
  createRoot(dispose => {
    seen.control = undefined;
    // Read in the root, as a component renders.
    void (withEstimated ? (
      <DateOfBirthInput
        draft={draft}
        path="history.dateOfLastBirth"
        estimatedPath="history.dateOfBirthIsEstimated"
        label="Date of last delivery"
      />
    ) : (
      <DateOfBirthInput
        draft={draft}
        path="history.dateOfLastBirth"
        label="Date of last delivery"
      />
    ));
    dispose();
    const control = lastControl();
    if (!control) throw new Error('the control was not rendered');
    return control;
  });

describe('DateOfBirthInput', () => {
  it("hands the control the plugin's label and the stored date", () => {
    const { draft } = fakeDraft({ 'history.dateOfLastBirth': '2024-05-01' });
    const c = render(draft, false);
    expect(c.label).toBe('Date of last delivery');
    expect(c.value).toBe('2024-05-01');
  });

  it('writes an age entry as estimated where the record keeps the mark', () => {
    const { draft, values } = fakeDraft({});
    render(draft, true).onChange('2020-01-01', true);
    expect(values).toEqual({
      'history.dateOfLastBirth': '2020-01-01',
      'history.dateOfBirthIsEstimated': true,
    });
  });

  it('removes the mark when a date is entered directly', () => {
    const { draft, values } = fakeDraft({
      'history.dateOfLastBirth': '2020-01-01',
      'history.dateOfBirthIsEstimated': true,
    });
    const c = render(draft, true);
    expect(c.estimated).toBe(true);
    c.onChange('2020-03-14', false);
    expect(values).toEqual({ 'history.dateOfLastBirth': '2020-03-14' });
  });

  it('writes no mark, and leaves the estimate to the control, without an estimatedPath', () => {
    const { draft, values } = fakeDraft({});
    const c = render(draft, false);
    expect(c.estimated).toBeUndefined();
    c.onChange('2020-01-01', true);
    expect(values).toEqual({ 'history.dateOfLastBirth': '2020-01-01' });
  });

  it('removes the date when it is cleared', () => {
    const { draft, values } = fakeDraft({
      'history.dateOfLastBirth': '2020-01-01',
    });
    render(draft, false).onChange(null, false);
    expect(values).toEqual({});
  });
});
