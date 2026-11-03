import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import type { PatientSearchProps } from './PatientSearch';

/*
 * OMS-REG-PLG-DJ-01.37: a next of kin recorded by name only, with no patient
 * matched, still shows its name. The picker is a stand-in that hands back
 * the props it was given, so this runs without a DOM (vitest.workspace.ts,
 * the solid project).
 */

vi.mock('./PatientSearch', () => ({
  PatientSearch: (p: PatientSearchProps) => p,
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

import {
  NAME_ONLY_NEXT_OF_KIN,
  NextOfKinControl,
  nextOfKinOption,
} from './PatientControls';

const render = (id: string | null, name: string) => {
  const onChange = vi.fn();
  const props = createRoot(dispose => {
    const out = (
      <NextOfKinControl
        storeId="store-a"
        id={id}
        name={name}
        onChange={onChange}
      />
    ) as unknown as PatientSearchProps;
    dispose();
    return out;
  });
  return { props, onChange };
};

describe('OMS-REG-PLG-DJ-01.37 — the next of kin field', () => {
  it('shows a next of kin recorded by name only', () => {
    const { props } = render(null, 'Hawa Ismaël');
    expect(props.selected?.name).toBe('Hawa Ismaël');
  });

  it('shows a matched next of kin under its patient id', () => {
    expect(nextOfKinOption('patient-2', 'Hawa Ismaël')?.id).toBe('patient-2');
  });

  it('shows nothing when no next of kin is recorded', () => {
    expect(nextOfKinOption(null, '')).toBeUndefined();
  });

  it('keeps a name-only next of kin when its own option is picked again', () => {
    const { props, onChange } = render(null, 'Hawa Ismaël');
    props.onSelect(nextOfKinOption(null, 'Hawa Ismaël') ?? null);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('replaces it with a patient picked from the search', () => {
    const { props, onChange } = render(null, 'Hawa Ismaël');
    props.onSelect(nextOfKinOption('patient-2', 'Ali Hawa') ?? null);
    expect(onChange).toHaveBeenCalledWith('patient-2', 'Ali Hawa');
  });

  it('clears it when the selection is cleared', () => {
    const { props, onChange } = render(null, 'Hawa Ismaël');
    props.onSelect(null);
    expect(onChange).toHaveBeenCalledWith(null, '');
  });

  it('shows the name-only one under its stand-in key, never a patient id', () => {
    expect(nextOfKinOption(null, 'Hawa Ismaël')?.id).toBe(
      NAME_ONLY_NEXT_OF_KIN
    );
  });
});
