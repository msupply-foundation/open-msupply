import { createSignal, untrack } from 'solid-js';

/*
 * Keyboard row navigation for a list table (spec/keyboard KB-N1, KB-N2, KB-E5,
 * AC-KB37/38/39/40; issue #1006 — the current app has it, this one did not).
 *
 * KB-N1: "A list table with focus responds to arrow keys: ArrowDown / ArrowUp
 * move the focused row one step, CLAMPED at the ends, scrolling it into view…
 * `Enter` opens the focused row. `Escape` clears the row focus."
 *
 * Row focus is TABLE-OWNED state, unlike sort and selection which the page
 * owns (kdd/table-state). The line is whether the state belongs in the URL:
 * sort and selection survive a reload and are shared by the card view, row
 * focus is ephemeral keyboard position and means nothing to anyone but the
 * table the user is looking at.
 *
 * THE TABLE IS THE TAB STOP, not the rows. The first build of this (removed in
 * 084123b1, see kdd/keyboard-layer) roved a `tabindex=0` between rows, which
 * makes the tab order depend on a signal: a focus left pointing at a row that a
 * filter, page change or delete removed took the table's ONLY tab stop with it,
 * and the keyboard could no longer reach the rows at all. Here `<table>` holds
 * the 0 permanently and rows carry -1, so they are focusable programmatically
 * (arrows move real DOM focus onto the row, which is what makes a screen reader
 * announce it — no `role=grid` contract we would then have to honour with
 * cell-level navigation) while the tab order cannot move underneath anyone. It
 * is also the shape the current app uses (useTableKeyboardNavigation).
 *
 * KB-N2 ("row navigation MUST NOT fire while focus is inside an input, select
 * or text area within the table") is structural here rather than a predicate
 * call: `handleKey` acts only on a key that landed ON the table or ON a row,
 * so a keystroke inside anything a cell contains — a field, a checkbox, a
 * link, a button — is not ours by construction. That is the wider rule the
 * first build lacked: with only an `isTextEntry` guard, `Enter` on a cell's
 * action button activated the button AND opened the row — two actions from one
 * press, which AC-KB26 forbids.
 */

export interface RowFocus {
  /** The focused row's key (`data-row-key`), or undefined for none. */
  focusedKey: () => string | undefined;
  /**
   * Handle a key on the table. Returns true when it consumed the key, so the
   * caller can `preventDefault()` + `stopPropagation()` — a rung must CONSUME
   * Escape, not merely stop it propagating, or the window-level tail still
   * fires (kdd/keyboard-layer).
   */
  handleKey: (event: KeyboardEvent, keys: readonly string[]) => boolean;
  /** Called when a row takes focus by pointer, to keep the two in step. */
  setFocused: (key: string | undefined) => void;
  /**
   * Drop a focus pointing at a row this table no longer shows — a filter, a
   * page change, a delete, or a refetch that reordered the list. The keyboard
   * is handed back to the table itself when the vanished row was holding DOM
   * focus, so arrows still work from where the user was rather than from
   * nowhere (focus would otherwise fall to `<body>`).
   */
  keepInRange: (
    keys: readonly string[],
    table: HTMLElement | undefined
  ) => void;
}

/** The row element for a key, within THIS table (never the document). */
const rowElement = (table: Element, key: string): HTMLElement | null =>
  table.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(key)}"]`);

/*
 * Did this key land on the table itself, or on a row — as opposed to on
 * something a cell contains? See KB-N2 above; `isTextEntry` cannot answer this,
 * because a button is not text entry.
 */
const originIsRow = (event: KeyboardEvent): boolean => {
  const target = event.target as Element | null;
  if (!target) return false;
  // tagName, not `instanceof HTMLTableRowElement`: an element from another
  // realm (a portaled subtree) fails `instanceof` silently — same reasoning as
  // utils/isTextEntry.
  return target === event.currentTarget || target.tagName === 'TR';
};

export const createRowFocus = (options: {
  /** Open the row with this key — `Enter` on a focused row (KB-E5). */
  onOpenRow?: (key: string) => void;
}): RowFocus => {
  const [focusedKey, setFocusedKey] = createSignal<string | undefined>();

  // Move the DOM focus with the highlight. Queried by `data-row-key` on the
  // table rather than held as a ref per row: rows come and go with the page's
  // data, and this is the same roving-within-an-open-list mechanism
  // kdd/focus-targets explicitly keeps out of the FocusTarget primitive.
  const focusRow = (table: Element, key: string) => {
    const row = rowElement(table, key);
    if (!row) return;
    // KB-N1 requires the moved-to row to be scrolled into view. `nearest` keeps
    // a row that is already visible exactly where it is; the sticky header is
    // cleared by the rows' scroll-margin (DataTable.module.css).
    row.scrollIntoView({ block: 'nearest' });
    row.focus({ preventScroll: true });
  };

  const handleKey = (
    event: KeyboardEvent,
    keys: readonly string[]
  ): boolean => {
    if (event.isComposing) return false;
    if (!originIsRow(event)) return false;

    // Always the <table> this listener is attached to (DataTable), so a cast
    // rather than an `instanceof` — which is false for an element from another
    // realm anyway (see the note in utils/isTextEntry).
    const table = event.currentTarget as HTMLElement | null;
    if (!table) return false;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (keys.length === 0) return false;
      const current = focusedKey();
      const index = current === undefined ? -1 : keys.indexOf(current);
      // CLAMPED (AC-KB38), deliberately unlike an option list, which wraps
      // (KB-N3). A list table is a window onto a paged dataset, so wrapping
      // from the last row to the first would claim the list ends there when it
      // may not.
      const next =
        event.key === 'ArrowDown'
          ? Math.min(index + 1, keys.length - 1)
          : Math.max(index - 1, 0);
      // From nowhere, ArrowDown starts at the first row and ArrowUp at the
      // last.
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

    // AC-KB39. Consumed ONLY when a row actually holds focus, so on a table
    // with no row focus Escape falls through to the rungs below (a dialog
    // cancelling, navigate-up). The keyboard stays on the table, so arrows
    // resume from the top rather than dead-ending on an element that no longer
    // means anything.
    if (event.key === 'Escape') {
      if (focusedKey() === undefined) return false;
      setFocusedKey(undefined);
      table.focus({ preventScroll: true });
      return true;
    }

    return false;
  };

  return {
    focusedKey,
    handleKey,
    /*
     * Idempotent, and that matters. `focusRow` moves DOM focus synchronously
     * from a native key handler, which fires the row's own `onFocus` — so an
     * unguarded setter wrote the same key again in the middle of the first
     * write's propagation. Solid then warned about computations created
     * outside a root, because the nested flush built `<For>` children with no
     * owner in scope. Dropping the no-op write removes the nesting entirely.
     */
    setFocused: key => {
      if (key === untrack(focusedKey)) return;
      setFocusedKey(key);
    },
    keepInRange: (keys, table) => {
      const key = untrack(focusedKey);
      if (key === undefined || keys.includes(key)) return;
      setFocusedKey(undefined);
      // Only reclaim the keyboard if this table was holding it — a row set that
      // changes while the user is typing in a filter must not yank the caret.
      if (table && table.contains(document.activeElement)) {
        table.focus({ preventScroll: true });
      }
    },
  };
};
