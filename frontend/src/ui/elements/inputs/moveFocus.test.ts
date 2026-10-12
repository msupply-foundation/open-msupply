import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { moveFocus, type MoveButtonElement } from './moveFocus';

/*
 * The focus half of a reorder (./moveFocus.ts). No document in this project
 * (vitest.workspace.ts), so the buttons are the narrow shape the registry
 * declares — which is the part under test anyway: WHICH button is focused
 * after a move, not how a browser focuses it.
 */

const OPPOSITE = { up: 'down', down: 'up' } as const;
type Direction = keyof typeof OPPOSITE;

// Typed as the registry's own shape, so the fake is held to what a real
// button answers — and counting its focuses is all a test needs to see.
const button = (): MoveButtonElement & { focused: number } => {
  const el = {
    isConnected: true,
    disabled: false,
    focused: 0,
    focus: () => {
      el.focused += 1;
    },
  };
  return el;
};

const registry = () => {
  const dispose = createRoot(d => d);
  return { focus: moveFocus<Direction>(OPPOSITE), dispose };
};

describe('moveFocus', () => {
  it('puts focus back on the button that was pressed', () => {
    createRoot(dispose => {
      const focus = moveFocus<Direction>(OPPOSITE);
      const up = button();
      focus.ref('a', 'up')(up);

      focus.restore('a', 'up');

      expect(up.focused).toBe(1);
      dispose();
    });
  });

  it('falls to the counterpart when the move disabled the pressed button', () => {
    createRoot(dispose => {
      const focus = moveFocus<Direction>(OPPOSITE);
      const up = button();
      const down = button();
      focus.ref('a', 'up')(up);
      focus.ref('a', 'down')(down);
      // The row reached the top, so _move up_ is dead and _move down_ is not.
      up.disabled = true;

      focus.restore('a', 'up');

      expect(up.focused).toBe(0);
      expect(down.focused).toBe(1);
      dispose();
    });
  });

  it('falls to the counterpart when the pressed button has left the document', () => {
    createRoot(dispose => {
      const focus = moveFocus<Direction>(OPPOSITE);
      const up = button();
      const down = button();
      focus.ref('a', 'up')(up);
      focus.ref('a', 'down')(down);
      up.isConnected = false;

      focus.restore('a', 'up');

      expect(down.focused).toBe(1);
      dispose();
    });
  });

  it('keeps each row apart', () => {
    createRoot(dispose => {
      const focus = moveFocus<Direction>(OPPOSITE);
      const a = button();
      const b = button();
      focus.ref('a', 'up')(a);
      focus.ref('b', 'up')(b);

      focus.restore('b', 'up');

      expect(a.focused).toBe(0);
      expect(b.focused).toBe(1);
      dispose();
    });
  });

  it('asks for nothing where the row was never registered', () => {
    const { focus, dispose } = registry();
    expect(() => focus.restore('missing', 'up')).not.toThrow();
    dispose();
  });

  it('forgets a row that has been disposed', () => {
    const focus = createRoot(dispose => {
      const made = moveFocus<Direction>(OPPOSITE);
      const up = button();
      made.ref('a', 'up')(up);
      dispose();
      return { made, up };
    });

    // The row is gone; restoring must not reach into its detached button.
    focus.made.restore('a', 'up');

    expect(focus.up.focused).toBe(0);
  });

  it('keeps the live button when a row re-registers before the old one cleans up', () => {
    createRoot(dispose => {
      const focus = moveFocus<Direction>(OPPOSITE);
      const first = button();
      const second = button();
      focus.ref('a', 'up')(first);
      focus.ref('a', 'up')(second);

      focus.restore('a', 'up');

      expect(second.focused).toBe(1);
      dispose();
    });
  });
});
