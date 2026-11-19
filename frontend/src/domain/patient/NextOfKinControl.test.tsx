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
  IconButton: (p: { onClick: () => void }) => p,
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

type Field = PickerFieldProps;
type Dialog = PatientSearchDialogProps;

const render = (id: string | null, name: string, disabled?: boolean) => {
  const onChange = vi.fn();
  const { field, dialog, dispose } = createRoot(dispose => {
    const out = (
      <NextOfKinControl
        storeId="store-a"
        id={id}
        name={name}
        disabled={disabled}
        onChange={onChange}
      />
    ) as unknown as [Field, () => Dialog | false | undefined];
    // The search sits behind a <Show>: read it through its accessor, which
    // is falsy until the field opens it.
    return { field: out[0], dialog: () => out[1](), dispose };
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
    expect(dialog()).toBeFalsy();
    field.onOpen();
    const opened = dialog() as Dialog;
    expect(opened.open).toBe(true);
    expect(opened.onCreatePatient).toBeUndefined();
    expect(opened.changingFrom).toBe('Ali Hawa');
    dispose();
  });

  it('replaces it with the patient chosen in the search', () => {
    const { field, dialog, onChange, dispose } = render(null, 'Hawa Ismaël');
    field.onOpen();
    (dialog() as Dialog).onChoose(row('patient-2', 'Ali Hawa'));
    expect(onChange).toHaveBeenCalledWith('patient-2', 'Ali Hawa');
    expect(dialog()).toBeFalsy();
    dispose();
  });

  it('changes nothing when the same patient is chosen', () => {
    const { field, dialog, onChange, dispose } = render(
      'patient-2',
      'Ali Hawa'
    );
    field.onOpen();
    (dialog() as Dialog).onChoose(row('patient-2', 'Ali Hawa'));
    expect(onChange).not.toHaveBeenCalled();
    dispose();
  });

  // The box's end action: the clear button behind its <Show>, if shown.
  const clearButton = (field: Field) =>
    (field.endAction as unknown as () => { onClick: () => void } | false)();

  it('clears it, a name-only one too', () => {
    const { field, onChange, dispose } = render(null, 'Hawa Ismaël');
    const clear = clearButton(field);
    expect(clear).toBeTruthy();
    (clear as { onClick: () => void }).onClick();
    expect(onChange).toHaveBeenCalledWith(null, '');
    dispose();
  });

  it('offers no clear when empty or not editable', () => {
    const empty = render(null, '');
    expect(clearButton(empty.field)).toBeFalsy();
    empty.dispose();
    const disabled = render('patient-2', 'Ali Hawa', true);
    expect(clearButton(disabled.field)).toBeFalsy();
    disabled.dispose();
  });
});
