/*
 * Focus across a move — the DOM half of a reorder, beside the pure order
 * arithmetic in ./reorderLogic.ts.
 *
 * A reorder MOVES the row's node, and Chromium blurs whatever was focused
 * inside a node it detaches and re-inserts (`insertBefore` detaches first). So
 * a keyboard user pressing _move up_ twice moves the row once and then presses
 * nothing: focus is back on the body. Every surface that reorders by a control
 * of its own carries that bug until it puts focus back itself, which is why
 * this is a primitive rather than a detail inside ReorderableList — its four
 * move buttons are one caller, a table header cell moved by a chevron pair
 * (the Afghanistan configuration editor's course columns) is another.
 *
 * `opposite` names, per direction, the button still live where the pressed one
 * has been disabled by its own move: a row that has reached the top cannot
 * move up again, so focus goes to _move down_.
 */
import { onCleanup } from 'solid-js';

/**
 * What a move button must answer. `HTMLButtonElement` satisfies it; narrowed
 * so the registry is testable in a suite with no document (vitest.workspace).
 */
export interface MoveButtonElement {
  isConnected: boolean;
  disabled: boolean;
  focus: () => void;
}

export interface MoveFocus<Direction extends string> {
  /**
   * `ref` for the button that moves `id` in `to`. Registered for the life of
   * the row, so a row that leaves takes its buttons out with it.
   */
  ref: (id: string, to: Direction) => (el: MoveButtonElement) => void;
  /**
   * Focus back on the button just pressed, once the move has landed — or on
   * its counterpart where that button is now disabled or gone. Call it
   * straight after the reorder: Solid has flushed by then, so the row has
   * already moved.
   */
  restore: (id: string, to: Direction) => void;
}

/** One registry per list, built in the component that owns the rows. */
export const moveFocus = <Direction extends string>(
  opposite: Readonly<Record<Direction, Direction>>
): MoveFocus<Direction> => {
  const buttons = new Map<string, MoveButtonElement>();
  const key = (id: string, to: Direction) => `${id}|${to}`;
  return {
    ref: (id, to) => el => {
      buttons.set(key(id, to), el);
      onCleanup(() => {
        // Only if it is still OURS: a re-registered row has already replaced
        // the entry, and deleting it would strand the live button.
        if (buttons.get(key(id, to)) === el) buttons.delete(key(id, to));
      });
    },
    restore: (id, to) => {
      const pressed = buttons.get(key(id, to));
      if (pressed?.isConnected && !pressed.disabled) {
        pressed.focus();
        return;
      }
      // At the end it just reached, the opposite button is the one still live.
      buttons.get(key(id, opposite[to]))?.focus();
    },
  };
};
