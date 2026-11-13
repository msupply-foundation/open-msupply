import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import type { PickerFieldProps } from '../../ui/elements/selectors/PickerField';
import type { PatientSearchDialogProps } from './PatientSearchDialog';

/*
 * The next of kin field (spec/patients S4): a picker box opening the patient
 * search. The box and the search are stand-ins that hand back the props they
 * were given, so this runs without a DOM (vitest.workspace.ts, the solid
 * project).
 */

vi.mock('../../ui/elements/selectors/PickerField', () => ({
  PickerField: (p: PickerFieldProps) => p,
}));
vi.mock('./PatientSearchDialog', () => ({
  PatientSearchDialog: (p: PatientSearchDialogProps) => p,
}));
vi.mock('../../ui/elements/buttons/IconButton', () => ({
  IconButton: () => null,
}));
// The module's other controls' inputs, which need a DOM to load.
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
vi.mock('../../store/storeContext', () => ({
  currentStoreName: () => 'Store',
}));

import { NextOfKinControl } from './PatientControls';

// Told apart by their callbacks; kept as given, since Solid's props are
// getters and copying them would freeze `open`.
type Field = PickerFieldProps;
type Dialog = PatientSearchDialogProps;

const render = (id: string | null, name: string) => {
  const onChange = vi.fn();
  const { field, dialog, dispose } = createRoot(dispose => {
    const out = (
      <NextOfKinControl
        storeId="store-a"
        id={id}
        name={name}
        onChange={onChange}
      />
    ) as unknown as (Field | Dialog)[];
    return {
      field: out.find(o => 'onOpen' in o) as Field,
      dialog: out.find(o => 'onChoose' in o) as Dialog,
      dispose,
    };
  });
  return { field, dialog, onChange, dispose };
};

const row = (id: string, name: string) =>
  ({ id, name }) as Parameters<PatientSearchDialogProps['onChoose']>[0];

describe('the next of kin field', () => {
  it('OMS-REG-PLG-DJ-01.37: shows a next of kin recorded by name only', () => {
    const { field, dispose } = render(null, 'Hawa Ismaël');
    expect(field.value).toBe('Hawa Ismaël');
    dispose();
  });

  it('shows the placeholder when no next of kin is recorded', () => {
    const { field, dispose } = render(null, '');
    expect(field.value).toBeUndefined();
    dispose();
  });

  it('opens the patient search from the box, without New patient', () => {
    const { field, dialog, dispose } = render('patient-2', 'Ali Hawa');
    expect(dialog.open).toBe(false);
    expect(dialog.onCreatePatient).toBeUndefined();
    expect(dialog.changingFrom).toBe('Ali Hawa');
    field.onOpen();
    expect(dialog.open).toBe(true);
    dispose();
  });

  it('replaces it with the patient chosen in the search', () => {
    const { dialog, onChange, dispose } = render(null, 'Hawa Ismaël');
    dialog.onChoose(row('patient-2', 'Ali Hawa'));
    expect(onChange).toHaveBeenCalledWith('patient-2', 'Ali Hawa');
    dispose();
  });

  it('changes nothing when the same patient is chosen', () => {
    const { dialog, onChange, dispose } = render('patient-2', 'Ali Hawa');
    dialog.onChoose(row('patient-2', 'Ali Hawa'));
    expect(onChange).not.toHaveBeenCalled();
    dispose();
  });
});
