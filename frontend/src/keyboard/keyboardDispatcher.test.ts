import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startKeyboardDispatcher } from './keyboardDispatcher';
import { createAction, registeredActions } from '../ui/utils/keyActions';
import { modifierHeld } from '../ui/utils/modifierHint';
import { ALT_N, ALT_S, ESCAPE, PLUS } from '../ui/utils/shortcuts';

// The dispatcher's whole job is the set of GATES in front of `action.run()`,
// and each gate exists because of a specific way the layer breaks without it:
//
//   KB-1        a global shortcut typed into a field is TEXT, not a command —
//               but the dialog tier is exempt, or a user who just typed a value
//               could not save without leaving the field;
//   ladder      a rung above consumed the key (preventDefault) and we must not
//               act on it as well;
//   repeat      a held key must not run an action twice;
//   isComposing an IME-composition key belongs to the composition;
//   KB-H1       the badges reveal even when the keystroke is consumed.
//
// Runs in the node environment, so `window`/`document` are stubbed with the
// minimal listener registry the dispatcher touches — the same approach
// createFocusTarget.test.ts takes with requestAnimationFrame.

type Listener = (event: KeyboardEvent) => void;

let listeners: Record<string, Listener[]>;
let activeElement: Element | null;
let stop: (() => void) | undefined;

const fakeTarget = () => ({
  addEventListener: (type: string, fn: Listener) => {
    (listeners[type] ??= []).push(fn);
  },
  removeEventListener: (type: string, fn: Listener) => {
    listeners[type] = (listeners[type] ?? []).filter(l => l !== fn);
  },
});

const press = (init: {
  code?: string;
  key?: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  repeat?: boolean;
  composing?: boolean;
  consumed?: boolean;
}) => {
  const preventDefault = vi.fn();
  const event = {
    code: init.code ?? '',
    key: init.key ?? '',
    altKey: init.alt === true,
    ctrlKey: init.ctrl === true,
    shiftKey: init.shift === true,
    metaKey: false,
    repeat: init.repeat === true,
    isComposing: init.composing === true,
    defaultPrevented: init.consumed === true,
    preventDefault,
  } as unknown as KeyboardEvent;
  for (const fn of listeners['keydown'] ?? []) fn(event);
  return { preventDefault };
};

const release = (init: { alt?: boolean; ctrl?: boolean } = {}) => {
  const event = {
    altKey: init.alt === true,
    ctrlKey: init.ctrl === true,
  } as unknown as KeyboardEvent;
  for (const fn of listeners['keyup'] ?? []) fn(event);
};

const textField = { tagName: 'INPUT', getAttribute: () => 'text' };
const row = { tagName: 'TR', getAttribute: () => null };

beforeEach(() => {
  listeners = {};
  activeElement = row as unknown as Element;
  vi.stubGlobal('navigator', { platform: 'Win32' });
  vi.stubGlobal('window', fakeTarget());
  vi.stubGlobal('document', {
    ...fakeTarget(),
    get activeElement() {
      return activeElement;
    },
  });
  stop = startKeyboardDispatcher();
  // modifierHeld is module scope, like the registry, so a test that left a
  // modifier "held" would be visible to the next one. Clear it through the
  // public path (a keyup with nothing held) rather than the dispatcher-only
  // setter.
  release();
});

afterEach(() => {
  stop?.();
  for (const action of registeredActions()) action.dispose();
  vi.unstubAllGlobals();
});

describe('the tier gate (KB-1)', () => {
  it('suppresses a global shortcut while a text field holds focus', () => {
    const run = vi.fn();
    createAction({ name: 'button.add-item', shortcut: ALT_N, run });

    activeElement = textField as unknown as Element;
    const { preventDefault } = press({ code: 'KeyN', alt: true });

    expect(run).not.toHaveBeenCalled();
    // AC-KB1: the action does not run AND the keystroke reaches the field, so
    // the dispatcher must not swallow it either.
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('fires a global shortcut outside a text field, claiming the key', () => {
    const run = vi.fn();
    createAction({ name: 'button.add-item', shortcut: ALT_N, run });

    const { preventDefault } = press({ code: 'KeyN', alt: true });

    expect(run).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('fires a surface-tier shortcut FROM INSIDE a text field (the dialog tier)', () => {
    const save = vi.fn();
    createAction({ name: 'button.save', shortcut: ALT_S, run: save });

    activeElement = textField as unknown as Element;
    press({ code: 'KeyS', alt: true });

    // AC-KB2: a user who has just typed a value saves without leaving the field.
    expect(save).toHaveBeenCalledOnce();
  });

  it('fires an always-tier bare character inside a text field (KB-L2)', () => {
    const addBatch = vi.fn();
    createAction({ name: 'label.add-batch', shortcut: PLUS, run: addBatch });

    activeElement = textField as unknown as Element;
    press({ key: '+', shift: true });

    expect(addBatch).toHaveBeenCalledOnce();
  });
});

describe('yielding to the rungs above', () => {
  it('does nothing when a rung above already consumed the key', () => {
    const navigateUp = vi.fn();
    createAction({ unlisted: true, shortcut: ESCAPE, run: navigateUp });

    // A slide-over, a table clearing row focus, or Kobalte's picker closing.
    press({ key: 'Escape', consumed: true });

    // AC-KB17/AC-KB18: no rung below the one that consumed it also acts.
    expect(navigateUp).not.toHaveBeenCalled();
  });

  it('runs the Escape tail when nothing above consumed it', () => {
    const navigateUp = vi.fn();
    createAction({ unlisted: true, shortcut: ESCAPE, run: navigateUp });

    press({ key: 'Escape' });

    expect(navigateUp).toHaveBeenCalledOnce();
  });

  it('suppresses the Escape tail inside a text field (KB-X5)', () => {
    const navigateUp = vi.fn();
    createAction({ unlisted: true, shortcut: ESCAPE, run: navigateUp });

    activeElement = textField as unknown as Element;
    press({ key: 'Escape' });

    expect(navigateUp).not.toHaveBeenCalled();
  });
});

describe('one press, one action', () => {
  it('ignores a repeating key', () => {
    const run = vi.fn();
    createAction({ name: 'button.add-item', shortcut: ALT_N, run });
    press({ code: 'KeyN', alt: true, repeat: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('ignores a key mid-IME-composition', () => {
    const run = vi.fn();
    createAction({ name: 'button.add-item', shortcut: ALT_N, run });
    press({ code: 'KeyN', alt: true, composing: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('leaves an unmatched key entirely alone', () => {
    createAction({ name: 'button.add-item', shortcut: ALT_N, run: () => {} });
    const { preventDefault } = press({ code: 'KeyQ', alt: true });
    // Never claim a key we did not match, or the browser's own shortcuts break.
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('modifier hints (KB-H1)', () => {
  it('reveals while Alt is held and hides on release', () => {
    expect(modifierHeld()).toBe(false);
    press({ code: 'KeyQ', alt: true });
    expect(modifierHeld()).toBe(true);
    release();
    expect(modifierHeld()).toBe(false);
  });

  it('reveals while Ctrl is held', () => {
    press({ code: 'KeyQ', ctrl: true });
    expect(modifierHeld()).toBe(true);
  });

  it('still reveals when the keystroke was consumed by a rung above', () => {
    // The badges are about what the user is HOLDING, not about what fired.
    press({ code: 'KeyQ', alt: true, consumed: true });
    expect(modifierHeld()).toBe(true);
  });

  it('keeps revealing while a second key is released but the modifier is held', () => {
    press({ code: 'KeyQ', alt: true });
    release({ alt: true });
    expect(modifierHeld()).toBe(true);
  });

  it('clears when the window loses focus, since Alt+Tab eats the keyup', () => {
    press({ code: 'KeyQ', alt: true });
    expect(modifierHeld()).toBe(true);
    for (const fn of listeners['blur'] ?? [])
      fn(undefined as unknown as KeyboardEvent);
    expect(modifierHeld()).toBe(false);
  });
});

describe('teardown', () => {
  it('removes every listener it added', () => {
    stop?.();
    stop = undefined;
    const counts = Object.values(listeners).flat();
    expect(counts).toHaveLength(0);
  });
});
