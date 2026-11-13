import {
  children,
  createRoot,
  createSignal,
  onCleanup,
  type JSX,
} from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The picker's Create patient button stays visible but disabled for a user
 * without patient-mutate permission, with the reason in an InfoTooltip beside
 * it, because the server refuses the save at the end of the create flow
 * (OMS-REG-DIS-03.18/.78, spec/patients § configuration gates). The
 * combobox, button and tooltip are stand-ins that record their props while
 * rendered, so this runs without a DOM.
 */

interface ComboboxProps {
  listboxFooter: (query: () => string) => JSX.Element;
}

const seen: {
  combobox?: ComboboxProps;
  button?: Record<string, unknown>;
  reason?: Record<string, unknown>;
} = {};

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
vi.mock('../../ui/elements/feedback/InfoTooltip', () => ({
  InfoTooltip: (p: Record<string, unknown>) => {
    seen.reason = p;
    onCleanup(() => delete seen.reason);
    return null;
  },
}));
// A pass-through row, so the footer's button and reason still reach the mocks.
vi.mock('../../ui/layout/Stack/HStack', () => ({
  HStack: (p: { children?: JSX.Element }) => p.children,
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
  delete seen.reason;
});

// Mount the picker, then open its result list with text typed, which is when
// the footer offers Create patient. The root is left alive (disposed in
// afterEach) so a later permission change still drives the footer.
const render = (props: { disabled?: boolean } = {}): void => {
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
  });
};

describe('OMS-REG-DIS-03.18/.78 — PatientSearch’s Create patient button', () => {
  it('is offered, enabled and reasonless to a user who may create patients', () => {
    render();
    expect(seen.button?.['data-testid']).toBe('create-patient-button');
    expect(seen.button?.disabled).toBeFalsy();
    expect(seen.reason).toBeUndefined();
  });

  it('stays visible but disabled, with the reason shown, for a user who may not create patients', () => {
    setCanMutatePatients(false);
    render();
    expect(seen.button?.['data-testid']).toBe('create-patient-button');
    expect(seen.button?.disabled).toBe(true);
    expect(seen.reason?.text).toBe('messages.create-patient-not-allowed');
  });

  it('follows the permission when it changes on an open picker', () => {
    render();
    expect(seen.button?.disabled).toBeFalsy();
    expect(seen.reason).toBeUndefined();
    setCanMutatePatients(false);
    expect(seen.button?.disabled).toBe(true);
    expect(seen.reason?.text).toBe('messages.create-patient-not-allowed');
    setCanMutatePatients(true);
    expect(seen.button?.disabled).toBeFalsy();
    expect(seen.reason).toBeUndefined();
  });

  it('is disabled along with the picker, with no permission reason', () => {
    render({ disabled: true });
    expect(seen.button?.disabled).toBe(true);
    expect(seen.reason).toBeUndefined();
  });
});
