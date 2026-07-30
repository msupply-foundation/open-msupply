import { createSignal } from 'solid-js';
import { isTextEntry } from '../../utils/isTextEntry';

/*
 * Keyboard row navigation for a list table (spec/keyboard KB-N1, KB-N2, KB-E5,
 * AC-KB37/38/39/40).
 *
 * KB-N1: "A list table with focus responds to arrow keys: ArrowDown / ArrowUp
 * move the focused row one step, CLAMPED at the ends, scrolling it into view…
 * `Enter` opens the focused row. `Escape` clears the row focus."
 *
 * Row focus is TABLE-OWNED state, unlike sort and selection which the page owns
 * (kdd/table-state). The line is whether the state belongs in the URL: sort and
 * selection survive a reload and are shared by the card view, row focus is
 * ephemeral keyboard position and means nothing to anyone but the table the user
 * is looking at.
 *
 * A ROVING TABINDEX, not a focusable cell per column: KB-T2 says "Table cells
 * MUST NOT be tab stops — `Tab` moves between INPUTS, matching the rest of the
 * app, rather than walking every cell." So the whole table is one tab stop, and
 * arrows move a `tabindex=0` between rows while every other row is `-1`.
 */

export interface RowFocus {
  /** The focused row's key (`data-row-key`), or undefined for none. */
  focusedKey: () => string | undefined;
  /** Whether this row should be the table's single tab stop. */
  isTabStop: (key: string, isFirst: boolean) => boolean;
  /**
   * Handle a key on the table. Returns true when it consumed the key, so the
   * caller can `preventDefault()` + `stopPropagation()` — a rung must CONSUME
   * Escape, not merely stop it propagating, or the window-level tail still fires
   * (kdd/keyboard-layer).
   */
  handleKey: (event: KeyboardEvent, keys: readonly string[]) => boolean;
  /** Called when a row takes focus by pointer or Tab, to keep the two in step. */
  setFocused: (key: string | undefined) => void;
}

export const createRowFocus = (options: {
  /** Open the row with this key — `Enter` on a focused row (KB-E5). */
  onOpenRow?: (key: string) => void;
}): RowFocus => {
  const [focusedKey, setFocusedKey] = createSignal<string | undefined>();

  // Move the DOM focus with the roving index. Queried by `data-row-key` on the
  // table itself rather than held as a ref per row: rows come and go with the
  // page's data, and this is the same roving-within-an-open-list mechanism
  // kdd/focus-targets explicitly keeps out of the FocusTarget primitive.
  const focusRow = (table: Element, key: string) => {
    const row = table.querySelector<HTMLElement>(
      `[data-row-key="${CSS.escape(key)}"]`
    );
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    row.focus({ preventScroll: true });
  };

  const handleKey = (
    event: KeyboardEvent,
    keys: readonly string[]
  ): boolean => {
    // KB-N2: "Row navigation MUST NOT fire while focus is inside an input,
    // select, or text area within the table — those keys belong to the field."
    // This is also what makes KB-S2 work: a numeric field in a cell keeps its
    // arrows for the caret, and the row never moves underneath it.
    if (isTextEntry(document.activeElement)) return false;
    if (event.isComposing) return false;

    const table = event.currentTarget;
    if (!(table instanceof Element)) return false;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (keys.length === 0) return false;
      const current = focusedKey();
      const index = current === undefined ? -1 : keys.indexOf(current);
      // CLAMPED, deliberately unlike an option list, which wraps (KB-N3). A list
      // table is a window onto a paged dataset, so wrapping from the last row to
      // the first would claim the list ends there when it may not.
      const next =
        event.key === 'ArrowDown'
          ? Math.min(index + 1, keys.length - 1)
          : Math.max(index - 1, 0);
      // From nowhere, ArrowDown starts at the first row and ArrowUp at the last.
      const key =
        index === -1
          ? event.key === 'ArrowDown'
            ? keys[0]
            : keys[keys.length - 1]
          : keys[next];
      if (key === undefined) return false;
      setFocusedKey(key);
      focusRow(table, key);
      return true;
    }

    if (event.key === 'Enter') {
      const key = focusedKey();
      if (key === undefined) return false;
      options.onOpenRow?.(key);
      return true;
    }

    // AC-KB39. Consumed ONLY when a row actually holds focus, so on a table with
    // no row focus Escape falls through to the rungs below (a dialog cancelling,
    // navigate-up).
    if (event.key === 'Escape') {
      if (focusedKey() === undefined) return false;
      setFocusedKey(undefined);
      return true;
    }

    return false;
  };

  return {
    focusedKey,
    // Exactly one row is reachable by Tab: the focused one, or the first row when
    // nothing is focused yet, so arriving by Tab lands somewhere sensible.
    isTabStop: (key, isFirst) => {
      const focused = focusedKey();
      return focused === undefined ? isFirst : focused === key;
    },
    handleKey,
    /*
     * Idempotent, and that matters. `focusRow` moves DOM focus synchronously from
     * a native key handler, which fires the row's own `onFocus` — so an
     * unguarded setter wrote the same key again in the middle of the first write's
     * propagation. Solid then warned about computations created outside a root,
     * because the nested flush built `<For>` children with no owner in scope.
     * Dropping the no-op write removes the nesting entirely.
     */
    setFocused: key => {
      if (key === focusedKey()) return;
      setFocusedKey(key);
    },
  };
};
