import {
  children,
  createRoot,
  createSignal,
  onCleanup,
  type JSX,
} from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The picker's Create patient button is hidden from a user without
 * patient-mutate permission, rather than opening a create flow whose save the
 * server refuses (OMS-REG-DIS-02.40, spec/patients § configuration gates). The
 * combobox and the button are stand-ins that record their props while
 * rendered, so this runs without a DOM.
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
    onCleanup(() => delete seen.button);
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
// A signal, as the real permission (read from the store context) is.
const [canMutatePatients, setCanMutatePatients] = createSignal(true);
vi.mock('../../store/storeContext', () => ({
  hasPermission: (permission: string) =>
    permission === 'PATIENT_MUTATE' && canMutatePatients(),
}));

import { PatientSearch } from './PatientSearch';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  setCanMutatePatients(true);
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

describe('OMS-REG-DIS-02.40 — PatientSearch’s Create patient button', () => {
  it('is offered to a user who may create patients', () => {
    const button = createButton();
    expect(button?.['data-testid']).toBe('create-patient-button');
    expect(button?.disabled).toBeFalsy();
  });

  it('is not offered to a user who may not create patients', () => {
    setCanMutatePatients(false);
    expect(createButton()).toBeUndefined();
  });

  it('follows the permission when it changes on an open picker', () => {
    expect(createButton()).toBeDefined();
    setCanMutatePatients(false);
    expect(seen.button).toBeUndefined();
    setCanMutatePatients(true);
    expect(seen.button?.['data-testid']).toBe('create-patient-button');
  });

  it('is disabled along with the picker', () => {
    expect(createButton({ disabled: true })?.disabled).toBe(true);
  });
});
