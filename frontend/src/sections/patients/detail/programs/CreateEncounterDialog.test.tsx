import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The create-encounter dialog's refusal of a type that is out of step
 * (OMS-REG-PLG-05.64): said as soon as the type is chosen, with Create
 * disabled, so nothing is filled in for a visit that can't be started. The
 * library components are stand-ins that keep their props.
 */

interface ButtonProps {
  'data-testid'?: string;
  disabled?: boolean;
  onClick: () => void;
}
interface AlertProps {
  testId?: string;
  children: unknown;
}
interface DialogProps {
  actions: unknown;
  children: unknown;
}

const shown: {
  dialog?: DialogProps;
  buttons: ButtonProps[];
  alerts: AlertProps[];
  select?: { onValueChange: (value: string) => void };
} = { buttons: [], alerts: [] };

const resolve = (value: unknown): unknown =>
  typeof value === 'function'
    ? resolve((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(resolve)
      : value;

vi.mock('../../../../ui/elements/feedback/Dialog', () => ({
  Dialog: (p: DialogProps) => {
    shown.dialog = p;
    return 'dialog';
  },
}));
vi.mock('../../../../ui/elements/feedback/Alert', () => ({
  Alert: (p: AlertProps) => {
    shown.alerts.push(p);
    return 'alert';
  },
}));
vi.mock('../../../../ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    shown.buttons.push(p);
    return 'button';
  },
}));
vi.mock('../../../../ui/elements/selectors/Select', () => ({
  Select: (p: { onValueChange: (value: string) => void }) => {
    shown.select = p;
    return 'select';
  },
}));
vi.mock('../../../../ui/elements/inputs/DateTimeField', () => ({
  DateTimeField: () => 'date',
}));
vi.mock('../../../../ui/elements/inputs/TextArea', () => ({
  TextArea: () => 'note',
}));
vi.mock('../../../../ui/layout/Stack/Stack', () => ({
  Stack: (p: { children: unknown }) => p.children,
}));
vi.mock('../../../../ui/icons', () => ({
  PlusCircleIcon: () => '',
  XCircleIcon: () => '',
}));
vi.mock('../../../../domain/clinician', () => ({
  ClinicianSelect: () => 'clinician',
}));
vi.mock('../../../../intl', () => ({ t: (key: string) => key }));
vi.mock('../../../../auth/authContext', () => ({
  authUser: () => undefined,
  userDisplayName: () => '',
}));
const persistDocument = vi.fn();
vi.mock(
  '../../../../domain/documentForm/createDocumentForm',
  async importOriginal => ({
    ...(await importOriginal<object>()),
    persistDocument: (...args: unknown[]) => persistDocument(...args),
  })
);
// The plugin forms in the browser: the follow-up's newest version is the
// registry's, the screening's is not.
vi.mock('../../../../plugins/documentFormSlot', () => ({
  documentFormVersioning: (_slot: string, documentType: string) => ({
    versions: documentType === 'FollowUp' ? ['follow-up-v1'] : ['screening-v1'],
    migrations: [],
    archived: [],
  }),
}));

import { CreateEncounterDialog } from './CreateEncounterDialog';
import type { FormRegistryFragment } from '../../../../domain/documentForm/documentForm.generated';

const entry = (id: string, documentType: string, formSchemaId: string) =>
  ({
    id,
    documentType,
    name: documentType,
    formSchemaId,
  }) as FormRegistryFragment;
const FOLLOW_UP = entry('follow-up', 'FollowUp', 'follow-up-v1');
const SCREENING = entry('screening', 'Screening', 'screening-v2');

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  persistDocument.mockReset();
});

const open = (defaultType: string) =>
  createRoot(d => {
    dispose = d;
    resolve(
      CreateEncounterDialog({
        open: true,
        storeId: 'store',
        patientId: 'patient',
        registries: [FOLLOW_UP, SCREENING],
        defaultType,
        onCreated: () => undefined,
        onClose: () => undefined,
      })
    );
  });

// The dialog's body and actions as they render now.
const rendered = () => {
  shown.buttons = [];
  shown.alerts = [];
  resolve(shown.dialog?.children);
  resolve(shown.dialog?.actions);
  return {
    create: shown.buttons.find(b => b['data-testid'] === 'dialog-button-ok'),
    notice: shown.alerts.find(a => a.testId === 'document-version-notice'),
  };
};

describe('OMS-REG-PLG-05.64 — a type out of step is not started', () => {
  it('says so as soon as it is chosen, and Create is disabled', () => {
    open('Screening');
    const { create, notice } = rendered();
    expect(resolve(notice?.children)).toBe(
      'messages.document-form-out-of-step'
    );
    expect(create?.disabled).toBe(true);
    create?.onClick();
    expect(persistDocument).not.toHaveBeenCalled();
  });

  it('says nothing for a type in step, and Create is enabled', () => {
    open('FollowUp');
    const { create, notice } = rendered();
    expect(notice).toBeUndefined();
    expect(create?.disabled).toBe(false);
  });

  it('follows the chosen type', () => {
    open('FollowUp');
    expect(rendered().create?.disabled).toBe(false);
    shown.select?.onValueChange('screening');
    expect(rendered().create?.disabled).toBe(true);
    shown.select?.onValueChange('follow-up');
    expect(rendered().notice).toBeUndefined();
  });
});
