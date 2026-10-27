import { children, createRoot, type JSX } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The picker's Create patient button is hidden from a user without
 * patient-mutate permission, rather than opening a create flow whose save the
 * server refuses (spec/patients § configuration gates). The combobox and the
 * button are stand-ins that record their props, so this runs without a DOM.
 */

interface ComboboxProps {
  listboxFooter: (query: () => string) => JSX.Element;
}

const seen: { combobox?: ComboboxProps; button?: Record<string, unknown> } = {};

vi.mock('../../ui/elements/selectors/AsyncCombobox', () => ({
  AsyncCombobox: (p: ComboboxProps) => {
    seen.combobox = p;
    return null;
  },
}));
vi.mock('../../ui/elements/buttons/Button', () => ({
  Button: (p: Record<string, unknown>) => {
    seen.button = p;
    return null;
  },
}));
vi.mock('../../ui/elements/buttons/IconButton', () => ({
  IconButton: () => null,
}));
vi.mock('../../intl', () => ({
  t: (key: string) => key,
  localisedDate: (value: string) => value,
}));
vi.mock('./patientResource', () => ({ patientSearchPageFetcher: () => {} }));
let canMutatePatients = true;
vi.mock('../../store/storeContext', () => ({
  hasPermission: (permission: string) =>
    permission === 'PATIENT_MUTATE' && canMutatePatients,
}));

import { PatientSearch } from './PatientSearch';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  canMutatePatients = true;
  delete seen.combobox;
  delete seen.button;
});

// Mount the picker, then open its result list with text typed, which is when
// the footer offers Create patient.
const createButton = (
  props: { disabled?: boolean } = {}
): Record<string, unknown> | undefined =>
  createRoot(d => {
    dispose = d;
    PatientSearch({
      label: 'Patient',
      storeId: 'store',
      onSelect: () => {},
      onCreatePatient: () => {},
      disabled: props.disabled,
    });
    children(() => seen.combobox?.listboxFooter(() => 'Smi'))();
    return seen.button;
  });

describe('PatientSearch’s Create patient button', () => {
  it('is offered to a user who may create patients', () => {
    const button = createButton();
    expect(button?.['data-testid']).toBe('create-patient-button');
    expect(button?.disabled).toBeFalsy();
  });

  it('is not offered to a user who may not create patients', () => {
    canMutatePatients = false;
    expect(createButton()).toBeUndefined();
  });

  it('is disabled along with the picker', () => {
    expect(createButton({ disabled: true })?.disabled).toBe(true);
  });
});
