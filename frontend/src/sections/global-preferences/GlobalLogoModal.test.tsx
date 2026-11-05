import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The global logo editor's save outcomes (spec/global-preferences rules § The
 * global logo editor, OMS-REG-GPREF-01.33/.34). The e2e suite drives saves
 * that succeed; this pins what a failed one does: the dialog stays open with
 * the draft intact and shows its own notice, and the save runs in the
 * background so the global error modal never stacks on top of that notice.
 * The library components are stand-ins that record their props, so the test
 * reads the notice and acts through the buttons' callbacks.
 */

interface ButtonProps {
  onClick: () => unknown;
  disabled?: boolean;
  loading?: boolean;
  'data-testid'?: string;
}
interface AlertProps {
  testId?: string;
  children: unknown;
}
interface UploadZoneProps {
  onPick: (
    accepted: File[],
    rejected: { file: { name: string }; reason: 'type' | 'size' }[]
  ) => void;
}

const shown: {
  dialog?: { actions: unknown; children: unknown };
  buttons: Record<string, ButtonProps>;
  alerts: AlertProps[];
  zone?: UploadZoneProps;
} = { buttons: {}, alerts: [] };

// Reads a JSX child the stand-ins returned, so conditional content renders.
const resolve = (value: unknown): unknown =>
  typeof value === 'function'
    ? resolve((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(resolve)
      : value;

const record = (p: ButtonProps) => {
  if (p['data-testid']) shown.buttons[p['data-testid']] = p;
  return 'button';
};

vi.mock('@/ui/elements/feedback/Dialog', () => ({
  Dialog: (p: { actions: unknown; children: unknown }) => {
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
vi.mock('@/ui/elements/buttons/StandardButtons', () => ({
  CancelButton: (p: ButtonProps) => record(p),
  DialogSaveButton: (p: ButtonProps) => record(p),
}));
vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => record(p),
}));
vi.mock('@/ui/elements/inputs/UploadZone', () => ({
  UploadZone: (p: UploadZoneProps) => {
    shown.zone = p;
    return 'zone';
  },
}));
vi.mock('@/ui/elements/typography/Text', () => ({
  Text: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Stack/Stack', () => ({
  Stack: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/icons', () => ({ TrashIcon: () => '' }));
vi.mock('@/intl', () => ({
  t: (key: string, params?: Record<string, string>) =>
    params?.filename ? `${key}:${params.filename}` : key,
}));
vi.mock('./GlobalPreferencesPage.module.css', () => ({ default: {} }));

const graphqlFetch = vi.fn();
vi.mock('@/api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { GlobalLogoModal } from './GlobalLogoModal';

// No stored logo: the preview's <img> needs a DOM, which this node run
// lacks, while the "None uploaded" fallback doesn't. A save is still driven
// through Save's own callback — the outcomes under test don't depend on what
// the draft holds.
const STORED = '';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  delete shown.dialog;
  delete shown.zone;
  shown.buttons = {};
  shown.alerts = [];
  graphqlFetch.mockReset();
});

/** Reads the dialog's footer and body as they stand now. */
const render = () => {
  shown.alerts = [];
  resolve(shown.dialog!.actions);
  resolve(shown.dialog!.children);
};

const open = () => {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  createRoot(d => {
    dispose = d;
    GlobalLogoModal({ storeId: 'store', value: STORED, onSaved, onClose });
  });
  render();
  return { onSaved, onClose };
};

const save = async () => {
  await shown.buttons['dialog-button-save']!.onClick();
  render();
};

const notices = () => shown.alerts.map(alert => resolve(alert.children));

describe('GlobalLogoModal', () => {
  it('saves in the background, then reports the value and closes', async () => {
    graphqlFetch.mockResolvedValue({
      kind: 'success',
      data: {
        centralServer: { preferences: { upsertPreferences: { ok: true } } },
      },
    });
    const { onSaved, onClose } = open();

    await save();

    const [, variables, options] = graphqlFetch.mock.calls[0]!;
    expect(variables).toEqual({ storeId: 'store', input: { globalLogo: '' } });
    // background: a failure is this dialog's to report, not the global modal's.
    expect(options).toEqual({ background: true, returnGraphqlErrors: true });
    expect(onSaved).toHaveBeenCalledWith('');
    expect(onClose).toHaveBeenCalled();
  });

  it.each([
    ['a connection failure', { kind: 'unexpectedError' }],
    ['a server refusal', { kind: 'graphqlError', message: 'no', errors: [] }],
    [
      'a save the server reports as not ok',
      {
        kind: 'success',
        data: {
          centralServer: { preferences: { upsertPreferences: { ok: false } } },
        },
      },
    ],
  ])(
    'stays open with the draft and its notice after %s',
    async (_name, failure) => {
      graphqlFetch.mockResolvedValue(failure);
      const { onSaved, onClose } = open();

      await save();

      expect(onSaved).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(notices()).toEqual(['error.something-wrong']);
      // The save has ended, so Cancel and a retry are usable again.
      expect(shown.buttons['dialog-button-save']!.loading).toBe(false);
      expect(shown.buttons['dialog-button-cancel']!.disabled).toBe(false);
    }
  );

  it('clears the failure notice when a retry starts', async () => {
    graphqlFetch.mockResolvedValueOnce({ kind: 'unexpectedError' });
    open();
    await save();
    expect(notices()).toEqual(['error.something-wrong']);

    let finish: (value: unknown) => void = () => undefined;
    graphqlFetch.mockReturnValueOnce(new Promise(r => (finish = r)));
    const retry = shown.buttons['dialog-button-save']!.onClick();
    render();
    expect(notices()).toEqual([]);
    finish({ kind: 'unexpectedError' });
    await retry;
    // The retry sent the same draft: a failure leaves it intact.
    expect(graphqlFetch.mock.calls[1]![1]).toEqual(
      graphqlFetch.mock.calls[0]![1]
    );
  });

  it('refuses a file by name and keeps the draft', () => {
    open();
    shown.zone!.onPick([], [{ file: { name: 'notes.txt' }, reason: 'type' }]);
    render();
    expect(notices()).toEqual(['error.file-type-not-supported:notes.txt']);
    // Nothing changed, so there is nothing to save.
    expect(shown.buttons['dialog-button-save']!.disabled).toBe(true);
  });
});
