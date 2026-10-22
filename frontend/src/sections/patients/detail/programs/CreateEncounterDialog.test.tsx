import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The create-encounter dialog's refusal of a type that is out of step
 * (OMS-REG-PLG-05.64): said as soon as the type is chosen, with Create
 * disabled, so nothing is filled in for a visit that can't be started. And
 * its next-visit mode (internal #1656), the prompt after Save as visited:
 * the same dialog under another title, prefilled with the suggestion. The
 * library components are stand-ins that keep their props.
 */

interface ButtonProps {
  'data-testid'?: string;
  disabled?: boolean;
  children?: unknown;
  onClick: () => void;
}
interface AlertProps {
  testId?: string;
  children: unknown;
}
interface DialogProps {
  title: unknown;
  testId?: string;
  description?: unknown;
  actions: unknown;
  children: unknown;
}
interface TextAreaProps {
  label: string;
  value: string;
}

const shown: {
  dialog?: DialogProps;
  buttons: ButtonProps[];
  alerts: AlertProps[];
  select?: { onValueChange: (value: string) => void };
  date?: { value: string | null };
  note?: TextAreaProps;
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
  DateTimeField: (p: { value: string | null }) => {
    shown.date = p;
    return 'date';
  },
}));
vi.mock('../../../../ui/elements/inputs/TextArea', () => ({
  TextArea: (p: TextAreaProps) => {
    shown.note = p;
    return 'note';
  },
}));
vi.mock('../../../../ui/layout/Stack/Stack', () => ({
  Stack: (p: { children: unknown }) => p.children,
}));
vi.mock('../../../../ui/elements/typography/LabelledValue', () => ({
  LabelledValue: (p: { children: unknown }) => p.children,
}));
vi.mock('../../../../ui/icons', () => ({
  CalendarIcon: () => '',
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

import {
  CreateEncounterDialog,
  startsNow,
  type CreateEncounterDialogProps,
} from './CreateEncounterDialog';
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

const open = (
  defaultType: string,
  extra: Partial<CreateEncounterDialogProps> = {}
) =>
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
        ...extra,
      })
    );
  });

// The dialog's body and actions as they render now.
const rendered = () => {
  shown.buttons = [];
  shown.alerts = [];
  resolve(shown.dialog?.description);
  resolve(shown.dialog?.children);
  resolve(shown.dialog?.actions);
  return {
    create: shown.buttons.find(b => b['data-testid'] === 'dialog-button-ok'),
    dismiss: shown.buttons.find(
      b => b['data-testid'] === 'dialog-button-cancel'
    ),
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

describe('the prompt to schedule the next visit (#1656)', () => {
  const suggestion = {
    patientName: 'Smith, Jay',
    startDatetime: '2026-11-05T09:30:00.000Z',
    reason: 'DPT 1, OPV 1',
  };

  it('is the same dialog under its own title, with Not now and Book', () => {
    open('FollowUp', { nextVisit: suggestion });
    const { create, dismiss } = rendered();
    expect(shown.dialog?.title).toBe('heading.schedule-next-visit');
    expect(shown.dialog?.testId).toBe('schedule-next-visit-dialog');
    expect(resolve(shown.alerts[0]?.children)).toBe(
      'messages.saved-as-visited'
    );
    expect(resolve(dismiss?.children)).toBe('button.not-now');
    expect(resolve(create?.children)).toBe('button.book');
    expect(shown.note?.label).toBe('label.reason');
  });

  it('starts from the suggested date and reason, and Book writes them with the type just saved', () => {
    persistDocument.mockResolvedValue({ kind: 'reported' });
    open('FollowUp', { nextVisit: suggestion });
    const { create } = rendered();
    expect(shown.date?.value).toBe(suggestion.startDatetime);
    expect(shown.note?.value).toBe(suggestion.reason);
    create?.onClick();
    expect(persistDocument).toHaveBeenCalledTimes(1);
    const input = persistDocument.mock.calls[0]?.[0] as {
      registry: FormRegistryFragment;
      data: {
        status: string;
        startDatetime: string;
        notes?: { text: string }[];
      };
    };
    expect(input.registry).toBe(FOLLOW_UP);
    expect(input.data.status).toBe('PENDING');
    expect(input.data.startDatetime).toBe(suggestion.startDatetime);
    expect(input.data.notes?.[0]?.text).toBe(suggestion.reason);
  });

  it('opens with the date empty where nothing is suggested, and New encounter with now', () => {
    open('FollowUp', { nextVisit: { patientName: 'Smith, Jay' } });
    rendered();
    expect(shown.date?.value).toBeNull();
    expect(shown.note?.value).toBe('');
    dispose?.();
    open('FollowUp');
    const { create, dismiss } = rendered();
    expect(shown.dialog?.title).toBe('label.new-encounter');
    expect(shown.date?.value).not.toBeNull();
    expect(resolve(dismiss?.children)).toBe('button.cancel');
    expect(resolve(create?.children)).toBe('button.create');
    expect(shown.note?.label).toBe('label.visit-notes');
  });
});

describe('startsNow', () => {
  const now = Date.parse('2026-10-22T09:00:00Z');
  it('is a visit under way, or within five minutes', () => {
    expect(startsNow('2026-10-22T08:00:00Z', now)).toBe(true);
    expect(startsNow('2026-10-22T09:05:00Z', now)).toBe(true);
  });
  it('is not one booked for later', () => {
    expect(startsNow('2026-10-22T09:06:00Z', now)).toBe(false);
    expect(startsNow('2026-10-29T09:00:00Z', now)).toBe(false);
  });
});
