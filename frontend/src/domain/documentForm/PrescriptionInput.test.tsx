import { createRoot, createSignal, getOwner, runWithOwner } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The form library's prescription control, on a record that names a
 * prescription. The SDK's prescription read is the mocked edge; the library
 * components are stand-ins that keep the props they were given, so the test
 * reads the notice and acts through the same callbacks the user would.
 */

interface AlertProps {
  severity: string;
  children: unknown;
}
interface ButtonProps {
  disabled: boolean;
  onClick: () => void;
  children: unknown;
  'data-testid'?: string;
}

const shown: { alert?: AlertProps; button?: ButtonProps } = {};

vi.mock('../../ui/elements/feedback/Alert', () => ({
  Alert: (p: AlertProps) => {
    shown.alert = p;
    return p.children;
  },
}));
vi.mock('../../ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    shown.button = p;
    return 'button';
  },
}));
vi.mock('../../intl', () => ({
  t: (key: string) => key,
  formatNumber: String,
  localisedDate: String,
}));
vi.mock('../../store/storeContext', () => ({ currentStoreId: () => 'store' }));
vi.mock('../../plugin-sdk/recordLink', () => ({ RecordLink: () => 'link' }));
vi.mock('../item/ItemSearch', () => ({ ItemSearch: () => 'search' }));

const [outcome, setOutcome] = createSignal<
  'found' | 'not-found' | 'unreadable' | undefined
>();
const refetch = vi.fn();
vi.mock('../../plugin-sdk/prescriptions', () => ({
  createPrescription: vi.fn(),
  useItemBatches: () => ({ data: () => undefined, loading: () => false }),
  usePrescriptionSummary: () => ({
    data: () => undefined,
    outcome,
    loading: () => false,
    refetch,
  }),
}));

import { createSaveCoordinator } from '../../plugins/formParticipation';
import type { Encounter } from '../../plugin-sdk/documents';
import { createDraft } from './draft';
import { PrescriptionInput } from './PrescriptionInput';

interface RhEncounter extends Encounter {
  extension?: { prescriptionId?: string };
}

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  setOutcome(undefined);
  refetch.mockReset();
  delete shown.alert;
  delete shown.button;
});

// Reads a rendered value all the way down, as the DOM would.
const render = (value: unknown): unknown =>
  typeof value === 'function'
    ? render((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(render)
      : value;

// Mounts the control on a record naming prescription rx-1. `show` reads what
// it renders, as the screen would, and `read` a part of it (passed as a
// function, so its props are read there too), both under the control's owner.
const mount = (): { show: () => void; read: (part: unknown) => unknown } =>
  createRoot(d => {
    dispose = d;
    const c = createDraft<RhEncounter>({
      schema: () => undefined,
      validate: () => undefined,
    });
    c.reset({
      createdDatetime: '2025-09-02T08:00:00Z',
      startDatetime: '2025-09-02T08:00:00Z',
      status: 'VISITED',
      extension: { prescriptionId: 'rx-1' },
    });
    const view = PrescriptionInput({
      draft: c.draft,
      form: createSaveCoordinator().participationFor('form'),
      path: 'extension.prescriptionId',
      patientId: 'fatouma',
      testId: 'rx',
    });
    const owner = getOwner();
    const read = (part: unknown) => runWithOwner(owner, () => render(part));
    return { show: () => void read(view), read };
  });

// OMS-REG-PLG-DJ-03.80: a prescription that could not be read says so, and
// offers a Retry that reads it again.
describe('PrescriptionInput, a prescription that could not be read', () => {
  it('says so and offers Retry, which reads it again', () => {
    const { show, read } = mount();
    setOutcome('unreadable');
    show();
    expect(shown.alert?.severity).toBe('error');
    expect(read(() => shown.alert?.children)).toContain(
      'error.prescription-not-read'
    );
    expect(read(() => shown.button?.children)).toBe('button.retry');
    expect(read(() => shown.button?.['data-testid'])).toBe('rx-retry');
    expect(shown.button?.disabled).toBe(false);
    shown.button?.onClick();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('offers no Retry for one this store cannot find', () => {
    const { show } = mount();
    setOutcome('not-found');
    show();
    expect(shown.alert?.severity).toBe('info');
    expect(shown.button).toBeUndefined();
  });
});
