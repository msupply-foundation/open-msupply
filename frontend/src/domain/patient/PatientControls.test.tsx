import { children, createRoot, type JSX } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The date of birth's age field takes its test id from the control's, with
 * `-age` added. A control given no test id gives the age field none either:
 * no attribute, never data-testid="false" (e2e/TESTIDS.md § conventions, a
 * test id is a deliberate hook). The inputs are stand-ins that record their
 * props, so this runs without a DOM.
 */

const seen: { age?: Record<string, unknown> } = {};
const ageProps = (): Record<string, unknown> | undefined => seen.age;

vi.mock('../../ui/layout/Form/FormRow', () => ({
  FormRow: (p: { children: JSX.Element }) => {
    // Resolve the row's fields, so the stand-ins below are called.
    children(() => p.children)();
    return null;
  },
}));
vi.mock('../../ui/elements/inputs/NumberField', () => ({
  NumberField: (p: Record<string, unknown>) => {
    seen.age = p;
    return null;
  },
}));
vi.mock('../../ui/elements/inputs/DateField', () => ({
  DateField: () => null,
}));
vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: () => null,
}));
vi.mock('../../ui/elements/inputs/Checkbox', () => ({ Checkbox: () => null }));
vi.mock('../../ui/elements/selectors/Combobox', () => ({
  Combobox: () => null,
}));
vi.mock('../../ui/elements/feedback/InfoTooltip', () => ({
  InfoTooltip: () => null,
}));
vi.mock('../../ui/elements/feedback/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));
vi.mock('../../ui/elements/buttons/Button', () => ({ Button: () => null }));
vi.mock('../../ui/elements/typography/LabelledValue', () => ({
  LabelledValue: () => null,
}));
vi.mock('./PatientSearch', () => ({ PatientSearch: () => null }));
vi.mock('../../store/storeContext', () => ({
  currentStoreName: () => 'Store',
}));

import { DateOfBirthControl } from './PatientControls';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  seen.age = undefined;
});

const render = (testId?: string) =>
  createRoot(d => {
    dispose = d;
    return (
      <DateOfBirthControl value={null} onChange={() => {}} testId={testId} />
    );
  });

describe('DateOfBirthControl’s age field', () => {
  it('has no test id when the control is given none', () => {
    render();
    const props = ageProps();
    expect(props).toBeDefined();
    expect(props?.['data-testid']).toBeUndefined();
  });

  it('takes the control’s test id with -age added', () => {
    render('child-dob');
    expect(ageProps()?.['data-testid']).toBe('child-dob-age');
  });
});
