import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { SurfaceActiveContext } from './surfaceActive';
import {
  createAction,
  createAddAction,
  registeredActions,
  resolveShortcut,
} from './keyActions';
import { ALT_D, ALT_N, ALT_M } from './shortcuts';

// The contract here is LIFETIME, because that is the whole reason this is a
// registry rather than a static list (kdd/keyboard-layer):
//
//   1. registration lasts exactly as long as the owner, so KB-R1's "registered
//      only while it is actually available" needs no discipline at a call site;
//   2. a disabled action neither fires nor lists (one field, AC-KB24);
//   3. LAST REGISTERED WINS, so a line editor's "New item" shadows the detail
//      screen's "Add item" while open and hands Alt+N back on close (KB-R2);
//   4. an unlisted action fires without being browsable (AC-KB11).

const press = (code: string, alt = true): KeyboardEvent =>
  ({
    code,
    key: '',
    altKey: alt,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
  }) as KeyboardEvent;

afterEach(() => {
  // Any action a test leaked (created ownerless without disposing) would be
  // visible to the next test — the registry is module scope by design.
  for (const action of registeredActions()) action.dispose();
  vi.unstubAllGlobals();
});

describe('createAction lifetime', () => {
  it('registers on creation and unregisters when its owner disposes', () => {
    expect(registeredActions()).toHaveLength(0);
    createRoot(dispose => {
      createAction({ name: 'button.save', shortcut: ALT_D, run: () => {} });
      expect(registeredActions()).toHaveLength(1);
      dispose();
      // This is KB-R1 as a mechanism: availability IS owner lifetime.
      expect(registeredActions()).toHaveLength(0);
    });
  });

  it('leaves an ownerless action for the caller to dispose', () => {
    const action = createAction({
      name: 'button.save',
      shortcut: ALT_D,
      run: () => {},
    });
    expect(registeredActions()).toHaveLength(1);
    action.dispose();
    expect(registeredActions()).toHaveLength(0);
  });
});

/*
 * An action declared inside a surface that stays MOUNTED while hidden — dialog
 * content — must stop answering its keys when the surface closes. `onCleanup`
 * cannot carry it, because nothing cleans up when a mounted dialog merely closes,
 * so `createAction` folds the surface's own flag into `disabled`
 * (utils/surfaceActive.ts). Left to a call site this fails silently, and for an
 * `always`-tier bare character (the line editor's `+`) it fails app-wide: the key
 * fires on every screen, inside every text field, for a dialog nobody can see.
 */
describe('a surface that is not showing', () => {
  const inSurface = <T>(open: () => boolean, body: () => T): T => {
    let result!: T;
    SurfaceActiveContext.Provider({
      value: open,
      get children() {
        result = body();
        return null;
      },
    });
    return result;
  };

  it('neither fires nor lists an action declared inside it', () =>
    createRoot(dispose => {
      const [open, setOpen] = createSignal(false);
      const run = vi.fn();
      inSurface(open, () =>
        createAction({ name: 'button.save', shortcut: ALT_M, run })
      );

      expect(resolveShortcut(press('KeyM'))).toBeUndefined();
      expect(registeredActions()[0]?.disabled?.()).toBe(true);

      setOpen(true);
      expect(resolveShortcut(press('KeyM'))).toBeDefined();
      expect(registeredActions()[0]?.disabled?.()).toBe(false);

      dispose();
    }));

  it("keeps the action's own disabled gate on top of the surface's", () =>
    createRoot(dispose => {
      const [enabled, setEnabled] = createSignal(false);
      inSurface(
        () => true,
        () =>
          createAction({
            name: 'button.save',
            shortcut: ALT_M,
            run: () => {},
            disabled: () => !enabled(),
          })
      );

      expect(resolveShortcut(press('KeyM'))).toBeUndefined();
      setEnabled(true);
      expect(resolveShortcut(press('KeyM'))).toBeDefined();

      dispose();
    }));
});

describe('resolveShortcut', () => {
  it('finds the action whose shortcut matches', () => {
    const run = vi.fn();
    createAction({ name: 'button.save', shortcut: ALT_D, run });
    resolveShortcut(press('KeyD'))?.run();
    expect(run).toHaveBeenCalledOnce();
  });

  it('returns nothing when no binding matches', () => {
    createAction({ name: 'button.save', shortcut: ALT_D, run: () => {} });
    expect(resolveShortcut(press('KeyX'))).toBeUndefined();
  });

  it('skips a disabled action', () => {
    let finalised = false;
    createAction({
      name: 'button.save',
      shortcut: ALT_D,
      run: () => {},
      disabled: () => finalised,
    });
    expect(resolveShortcut(press('KeyD'))).toBeDefined();
    finalised = true;
    // Read at keypress time, so no re-registration is needed when it flips.
    expect(resolveShortcut(press('KeyD'))).toBeUndefined();
  });

  it('gives the binding to the last registered action, so a nested surface shadows the screen', () => {
    const screen = vi.fn();
    const editor = vi.fn();
    createAction({ name: 'button.add-item', shortcut: ALT_N, run: screen });
    createRoot(dispose => {
      createAction({ name: 'label.new-item', shortcut: ALT_N, run: editor });
      resolveShortcut(press('KeyN'))?.run();
      expect(editor).toHaveBeenCalledOnce();
      expect(screen).not.toHaveBeenCalled();
      dispose();
    });
    // The editor closed; Alt+N belongs to the screen again.
    resolveShortcut(press('KeyN'))?.run();
    expect(screen).toHaveBeenCalledOnce();
  });

  it('ignores an action that carries no shortcut', () => {
    createAction({ name: 'cmdk.goto-dashboard', run: () => {} });
    expect(resolveShortcut(press('KeyD'))).toBeUndefined();
    expect(registeredActions()).toHaveLength(1);
  });
});

describe('listing', () => {
  it('lists a named action and fires an unlisted one without listing it', () => {
    const navigateUp = vi.fn();
    createAction({ name: 'button.save', shortcut: ALT_D, run: () => {} });
    createAction({ unlisted: true, shortcut: ALT_M, run: navigateUp });

    // AC-KB11: the nameless entry owns its binding but is browsable nowhere.
    const listed = registeredActions().filter(a => a.name !== undefined);
    expect(listed).toHaveLength(1);
    resolveShortcut(press('KeyM'))?.run();
    expect(navigateUp).toHaveBeenCalledOnce();
  });
});

describe('createAddAction', () => {
  it('fixes the binding to Alt+N and names the entry after its control', () => {
    const run = vi.fn();
    const action = createAddAction({ name: 'button.add-item', run });
    expect(action.shortcut).toBe(ALT_N);
    expect(action.name).toBe('button.add-item');
    resolveShortcut(press('KeyN'))?.run();
    expect(run).toHaveBeenCalledOnce();
  });
});
