import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Whether the patient forms show Code 2 (the National ID): decided once per
 * patient, from whether the patient had one when the form opened, so clearing
 * it mid-edit doesn't take the field away and typing one in doesn't add it.
 * The module's other controls' inputs are stand-ins, as they need a DOM.
 */

vi.mock('../../ui/layout/Form/FormRow', () => ({ FormRow: () => null }));
vi.mock('../../ui/elements/inputs/NumberField', () => ({
  NumberField: () => null,
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

import { createShowCode2 } from './PatientControls';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
});

const mount = (id: string | undefined, code2: string | null | undefined) => {
  const [patientId, setPatientId] = createSignal(id);
  const [value, setValue] = createSignal(code2);
  const shown = createRoot(d => {
    dispose = d;
    return createShowCode2(patientId, value);
  });
  return { shown, setPatientId, setValue };
};

describe('OMS-REG-DIS-01.76 — Code 2 shows only for a patient who had one when the form opened', () => {
  it('shows for a patient with a National ID', () => {
    expect(mount('p1', 'N-1').shown()).toBe(true);
  });

  it('hides for a patient with none, or only spaces', () => {
    expect(mount('p1', null).shown()).toBe(false);
    dispose?.();
    expect(mount('p1', '   ').shown()).toBe(false);
  });

  it('stays shown when the value is cleared mid-edit', () => {
    const { shown, setValue } = mount('p1', 'N-1');
    setValue('');
    expect(shown()).toBe(true);
  });

  it('stays hidden when a value is typed in mid-edit', () => {
    const { shown, setValue } = mount('p1', '');
    setValue('N-2');
    expect(shown()).toBe(false);
  });

  it('decides again when another patient is loaded', () => {
    const { shown, setPatientId, setValue } = mount('p1', '');
    setValue('N-2');
    setPatientId('p2');
    expect(shown()).toBe(true);
    setValue(null);
    setPatientId('p3');
    expect(shown()).toBe(false);
  });
});
