import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The enrolment dialog (spec/program-enrolment ui-surface S3, rules § saving,
 * § editing an enrolment, § leaving with unsaved changes; cases
 * OMS-REG-PAT-04). The document form host is a stand-in whose state the test
 * sets (its own rules are createDocumentForm.saveGuards.test.tsx); the
 * library components keep their props, so the test reads the banners, the
 * title and the discard prompt as rendered and acts through their callbacks.
 */

interface AlertProps {
  severity: string;
  testId?: string;
  children: unknown;
}
interface DialogProps {
  title: string;
  onClose: () => void;
  children: unknown;
  footer: unknown;
  actions: unknown;
}
interface ConfirmProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const shown: {
  dialog?: DialogProps;
  alerts: AlertProps[];
  details?: string;
  discard?: ConfirmProps;
  hostOptions?: Record<string, unknown>;
  buttons: { 'data-testid'?: string }[];
  summaries: number;
} = { alerts: [], buttons: [], summaries: 0 };

// Reads a JSX child the stand-ins returned, so a banner renders when shown.
const resolve = (value: unknown): unknown =>
  typeof value === 'function'
    ? resolve((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(resolve)
      : value;

vi.mock('@/ui/elements/feedback/Dialog', () => ({
  Dialog: (p: DialogProps) => {
    shown.dialog = p;
    return 'dialog';
  },
}));
vi.mock('@/ui/elements/feedback/Alert', () => ({
  Alert: (p: AlertProps) => {
    shown.alerts.push(p);
    return 'alert';
  },
}));
vi.mock('@/ui/elements/feedback/ErrorDetails', () => ({
  ErrorDetails: (p: { detail: string }) => {
    shown.details = p.detail;
    return 'details';
  },
}));
vi.mock('@/ui/elements/feedback/ConfirmDialog', () => ({
  ConfirmDialog: (p: ConfirmProps) => {
    shown.discard = p;
    return 'confirm';
  },
}));
vi.mock('@/ui/elements/feedback/Spinner', () => ({ Spinner: () => 'spinner' }));
vi.mock('@/ui/layout/Stack/Stack', () => ({
  Stack: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Form/FormErrorSummary', () => ({
  FormErrorSummary: () => {
    shown.summaries++;
    return 'summary';
  },
}));
vi.mock('@/domain/documentForm/DocumentVersionNotice', () => ({
  DocumentVersionNotice: () => 'version notice',
}));
vi.mock('@/domain/documentForm/DocumentKeptValues', () => ({
  DocumentKeptValues: () => 'kept values',
}));
vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (p: { 'data-testid'?: string }) => {
    shown.buttons.push(p);
    return 'button';
  },
}));
vi.mock('@/ui/icons', () => ({ SaveIcon: () => '', XCircleIcon: () => '' }));
vi.mock('@/intl', () => ({ t: (key: string) => key }));
vi.mock('@/api/graphql', () => ({ reportPermissionDenied: vi.fn() }));
vi.mock('@/plugins/DocumentFormRegion', () => ({
  DocumentFormRegion: () => 'form',
}));
const [pluginForm, setPluginForm] = createSignal(false);
vi.mock('@/plugins/documentFormSlot', () => ({
  documentFormVersioning: () => undefined,
  documentFormFor: () => ({
    occupant: pluginForm() ? { id: 'demo.enrolment-form' } : undefined,
    diagnostics: [],
  }),
}));
// What the program's own form schema finds missing in the enrolment.
let missing: string[] = [];
const library = {
  DefaultEnrolmentForm: () => 'default form',
  validateDocument: () =>
    missing.map(path => ({ path, keyword: 'required', message: '' })),
};

const [dirty, setDirty] = createSignal(false);
const [saveError, setSaveError] = createSignal<string>();
const [newerVersion, setNewerVersion] = createSignal(false);
vi.mock('@/domain/documentForm/createDocumentForm', () => ({
  createDocumentForm: (options: Record<string, unknown>) => {
    shown.hostOptions = options;
    return {
      status: () => 'ready',
      library: () => library,
      registry: () => ({
        name: 'TB Program',
        documentType: 'TBProgram',
        formSchemaId: 'tb_v1',
        jsonSchema: {},
      }),
      document: () => undefined,
      draft: {},
      isDirty: dirty,
      canSave: () => true,
      saving: () => false,
      saveError,
      newerVersion,
      version: () => ({ kind: 'current' }),
      kept: () => [],
      validation: { visible: () => [] },
      edit: () => undefined,
      save: async () => undefined,
    };
  },
}));

import { reportPermissionDenied } from '@/api/graphql';
import { EnrolmentModal } from './EnrolmentModal';
import type { FormRegistryFragment } from '@/domain/documentForm/documentForm.generated';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  shown.alerts = [];
  shown.buttons = [];
  missing = [];
  setPluginForm(false);
  delete shown.details;
  setDirty(false);
  setSaveError(undefined);
  setNewerVersion(false);
});

const open = () => {
  const onClose = vi.fn();
  createRoot(d => {
    dispose = d;
    const view = EnrolmentModal({
      storeId: 'store',
      patientId: 'patient',
      target: {
        kind: 'new',
        registry: { documentType: 'TBProgram' } as FormRegistryFragment,
      },
      onClose,
      onSaved: () => undefined,
    });
    resolve(view);
    return view;
  });
  // The banner region, as the dialog would render it.
  const banners = () => {
    shown.alerts = [];
    resolve(shown.dialog?.footer);
    return shown.alerts;
  };
  return { onClose, banners };
};

describe('OMS-REG-PAT-04.7 — the enrolment is titled with its program', () => {
  it("takes the program's name", () => {
    open();
    expect(shown.dialog?.title).toBe('TB Program');
  });
});

describe('OMS-REG-PAT-04.8 / .9 — what a new enrolment starts with', () => {
  const seed = () =>
    (
      shown.hostOptions?.source as () => {
        data: { enrolmentDatetime: string; storeId: string };
      }
    )().data;

  it('is enrolled now (.8)', () => {
    const before = Date.now();
    open();
    const enrolled = Date.parse(seed().enrolmentDatetime);
    expect(enrolled).toBeGreaterThanOrEqual(before - 1000);
    expect(enrolled).toBeLessThanOrEqual(Date.now());
  });

  it('records this store as its store, and nothing else (.9)', () => {
    open();
    expect(Object.keys(seed()).sort()).toEqual([
      'enrolmentDatetime',
      'storeId',
    ]);
    expect(seed().storeId).toBe('store');
  });
});

describe('OMS-REG-PAT-04.20 / .21 / .26 — refusals', () => {
  it('a refused save shows "Failed to save program enrolment" with the server reason (.20)', () => {
    const { banners } = open();
    setSaveError('ProgramEnrolmentExists');
    const [banner] = banners();
    expect(banner).toMatchObject({
      severity: 'error',
      testId: 'enrolment-save-error',
    });
    expect(resolve(banner.children)).toContain(
      'error.failed-to-save-program-enrolment'
    );
    expect(shown.details).toBe('ProgramEnrolmentExists');
  });

  it('a Forbidden goes to the permission-denied modal (.21)', () => {
    open();
    expect(shown.hostOptions?.onForbidden).toBe(reportPermissionDenied);
  });

  it('asks the host to refuse a save over a newer version (.26)', () => {
    open();
    expect(shown.hostOptions?.refuseNewerVersion).toBe(true);
  });

  it('the newer-version refusal shows its own notice (.26)', () => {
    const { banners } = open();
    setNewerVersion(true);
    const [banner] = banners();
    expect(banner).toMatchObject({
      severity: 'warning',
      testId: 'enrolment-newer-version',
    });
    expect(resolve(banner.children)).toBe(
      'messages.enrolment-changed-since-opened'
    );
  });

  it('shows no banner while nothing is refused', () => {
    const { banners } = open();
    expect(banners()).toEqual([]);
  });
});

describe('OMS-REG-PAT-04.16 – .19 — leaving with unsaved changes', () => {
  it('an unchanged enrolment closes at once, without asking (.16)', () => {
    const { onClose } = open();
    shown.dialog?.onClose();
    expect(onClose).toHaveBeenCalledOnce();
    expect(shown.discard?.open).toBe(false);
  });

  it('a changed enrolment asks whether to discard (.17)', () => {
    const { onClose } = open();
    setDirty(true);
    shown.dialog?.onClose();
    expect(shown.discard?.open).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('discarding closes it, unsaved (.18)', () => {
    const { onClose } = open();
    setDirty(true);
    shown.dialog?.onClose();
    shown.discard?.onConfirm();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('declining returns to the enrolment (.19)', () => {
    const { onClose } = open();
    setDirty(true);
    shown.dialog?.onClose();
    shown.discard?.onClose();
    expect(shown.discard?.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("OMS-REG-PAT-04.52 — a program whose form the default form can't stand in for", () => {
  const save = () =>
    shown.buttons.filter(b => b['data-testid'] === 'dialog-button-ok');
  const body = () => {
    shown.alerts = [];
    shown.buttons = [];
    shown.summaries = 0;
    resolve(shown.dialog?.children);
    resolve(shown.dialog?.actions);
  };

  it("says the program's own form isn't installed, naming what it asks for, and offers no Save", () => {
    missing = ['status', 'extension.riskGroup'];
    open();
    body();
    const notice = shown.alerts.find(
      a => a.testId === 'enrolment-form-missing'
    );
    expect(notice?.severity).toBe('warning');
    expect(resolve(notice?.children)).toBe(
      'messages.enrolment-form-not-installed'
    );
    expect(save()).toHaveLength(0);
    expect(shown.summaries).toBe(0);
  });

  it('a field the default form asks for is not one it lacks', () => {
    missing = ['enrolmentDatetime'];
    open();
    body();
    expect(shown.alerts.some(a => a.testId === 'enrolment-form-missing')).toBe(
      false
    );
    expect(save()).toHaveLength(1);
  });

  it("with the program's own form loaded, there is nothing to say", () => {
    missing = ['status'];
    setPluginForm(true);
    open();
    body();
    expect(shown.alerts.some(a => a.testId === 'enrolment-form-missing')).toBe(
      false
    );
    expect(save()).toHaveLength(1);
  });
});
