import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRowFocus } from './createRowFocus';

// The contract here is spec/keyboard KB-N1/KB-N2/KB-E5 (AC-KB37–40), which is
// four rules with one shared failure mode — a key the table takes when it was
// not the table's to take:
//
//   1. arrows move the highlight and CLAMP at both ends (unlike the palette's
//      option list, which wraps — KB-N3);
//   2. Enter opens the highlighted row, and nothing when none is highlighted;
//   3. Escape clears, and is consumed ONLY then, so a dialog beneath still
//      closes on a table with no row focus;
//   4. a key that landed on something inside a cell is never ours (KB-N2) —
//      the rule the first build lacked, which let Enter on a cell's button both
//      activate the button and open the row.

// The rows the fake table "renders". `focus`/`scrollIntoView` are recorded so a
// test can assert which row the keyboard moved to.
const fakeTable = (keys: string[]) => {
  const focused: string[] = [];
  const rows = new Map(
    keys.map(key => [
      key,
      {
        focus: () => focused.push(key),
        scrollIntoView: vi.fn(),
      } as unknown as HTMLElement,
    ])
  );
  const table = {
    querySelector: (selector: string) => {
      const key = /\[data-row-key="(.*)"\]/.exec(selector)?.[1];
      return (key && rows.get(key)) || null;
    },
    focus: vi.fn(),
    contains: () => true,
  };
  return { table: table as unknown as HTMLElement, focused };
};

// A key pressed ON the table (no row focused yet) or ON a row — the two origins
// row navigation owns.
const press = (
  key: string,
  table: HTMLElement,
  target: 'table' | 'row' | 'cell-button' = 'table'
): KeyboardEvent =>
  ({
    key,
    isComposing: false,
    currentTarget: table,
    target:
      target === 'table'
        ? table
        : { tagName: target === 'row' ? 'TR' : 'BUTTON' },
  }) as unknown as KeyboardEvent;

beforeEach(() => {
  // The row lookup escapes the key for the selector; `document` is only read
  // when a vanished row hands the keyboard back (keepInRange).
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  vi.stubGlobal('document', { activeElement: null });
});

afterEach(() => vi.unstubAllGlobals());

describe('arrow movement', () => {
  it('starts at the first row from nowhere and steps down', () => {
    const { table, focused } = fakeTable(['a', 'b', 'c']);
    const rowFocus = createRowFocus({});
    const keys = ['a', 'b', 'c'];

    expect(rowFocus.handleKey(press('ArrowDown', table), keys)).toBe(true);
    expect(rowFocus.focusedKey()).toBe('a');
    rowFocus.handleKey(press('ArrowDown', table, 'row'), keys);
    expect(rowFocus.focusedKey()).toBe('b');
    // The moved-to row takes real DOM focus, which is what a screen reader
    // announces (no aria-activedescendant, no role=grid).
    expect(focused).toEqual(['a', 'b']);
  });

  it('starts at the last row when the first key is ArrowUp', () => {
    const { table } = fakeTable(['a', 'b', 'c']);
    const rowFocus = createRowFocus({});
    rowFocus.handleKey(press('ArrowUp', table), ['a', 'b', 'c']);
    expect(rowFocus.focusedKey()).toBe('c');
  });

  it('CLAMPS at both ends rather than wrapping (AC-KB38)', () => {
    const { table } = fakeTable(['a', 'b']);
    const rowFocus = createRowFocus({});
    const keys = ['a', 'b'];

    rowFocus.handleKey(press('ArrowDown', table), keys);
    rowFocus.handleKey(press('ArrowDown', table), keys);
    rowFocus.handleKey(press('ArrowDown', table), keys);
    expect(rowFocus.focusedKey()).toBe('b');

    rowFocus.handleKey(press('ArrowUp', table), keys);
    rowFocus.handleKey(press('ArrowUp', table), keys);
    expect(rowFocus.focusedKey()).toBe('a');
  });

  it('does not consume an arrow on an empty table', () => {
    const { table } = fakeTable([]);
    const rowFocus = createRowFocus({});
    expect(rowFocus.handleKey(press('ArrowDown', table), [])).toBe(false);
  });
});

describe('Enter opens the focused row (KB-E5)', () => {
  it('opens the highlighted row', () => {
    const { table } = fakeTable(['a', 'b']);
    const onOpenRow = vi.fn();
    const rowFocus = createRowFocus({ onOpenRow });

    rowFocus.handleKey(press('ArrowDown', table), ['a', 'b']);
    expect(rowFocus.handleKey(press('Enter', table, 'row'), ['a', 'b'])).toBe(
      true
    );
    expect(onOpenRow).toHaveBeenCalledWith('a');
  });

  it('leaves Enter alone when no row is highlighted', () => {
    const { table } = fakeTable(['a']);
    const onOpenRow = vi.fn();
    const rowFocus = createRowFocus({ onOpenRow });
    // Not consumed, so a dialog's confirm ladder below still gets the key.
    expect(rowFocus.handleKey(press('Enter', table), ['a'])).toBe(false);
    expect(onOpenRow).not.toHaveBeenCalled();
  });
});

describe('Escape clears the highlight (AC-KB39)', () => {
  it('clears and consumes only while a row is focused', () => {
    const { table } = fakeTable(['a']);
    const rowFocus = createRowFocus({});

    // Nothing focused: the key belongs to whatever is beneath (a dialog
    // cancelling, navigate-up), so it must NOT be consumed.
    expect(rowFocus.handleKey(press('Escape', table), ['a'])).toBe(false);

    rowFocus.handleKey(press('ArrowDown', table), ['a']);
    expect(rowFocus.handleKey(press('Escape', table, 'row'), ['a'])).toBe(true);
    expect(rowFocus.focusedKey()).toBeUndefined();
  });
});

describe('origin (KB-N2)', () => {
  it('ignores a key pressed on a control inside a cell', () => {
    const { table } = fakeTable(['a', 'b']);
    const onOpenRow = vi.fn();
    const rowFocus = createRowFocus({ onOpenRow });
    rowFocus.handleKey(press('ArrowDown', table), ['a', 'b']);

    // Enter on a cell's action button activates the BUTTON. Consuming it here
    // too would be two actions from one press (AC-KB26).
    expect(
      rowFocus.handleKey(press('Enter', table, 'cell-button'), ['a', 'b'])
    ).toBe(false);
    expect(onOpenRow).not.toHaveBeenCalled();

    // And the arrows must not move the highlight out from under a control the
    // user is operating — a field's caret, a select's options.
    expect(
      rowFocus.handleKey(press('ArrowDown', table, 'cell-button'), ['a', 'b'])
    ).toBe(false);
    expect(rowFocus.focusedKey()).toBe('a');
  });

  it('ignores a key mid-composition', () => {
    const { table } = fakeTable(['a']);
    const rowFocus = createRowFocus({});
    const event = {
      ...press('ArrowDown', table),
      isComposing: true,
    } as unknown as KeyboardEvent;
    // Spread drops the getters the cast hides, so restate the two it reads.
    Object.assign(event, { currentTarget: table, target: table });
    expect(rowFocus.handleKey(event, ['a'])).toBe(false);
  });
});

describe('a highlight that outlives its row', () => {
  it('is dropped, and hands the keyboard back to the table', () => {
    const { table } = fakeTable(['a', 'b']);
    const rowFocus = createRowFocus({});
    rowFocus.handleKey(press('ArrowDown', table), ['a', 'b']);
    expect(rowFocus.focusedKey()).toBe('a');

    // A filter, a page change or a delete replaced the rows. Left pointing at a
    // row that is gone, the next arrow press would resolve to index -1 and jump
    // the user to the top of a list they were part-way down.
    rowFocus.keepInRange(['c', 'd'], table);
    expect(rowFocus.focusedKey()).toBeUndefined();
    expect(table.focus).toHaveBeenCalled();
  });

  it('leaves a still-present highlight alone', () => {
    const { table } = fakeTable(['a', 'b']);
    const rowFocus = createRowFocus({});
    rowFocus.handleKey(press('ArrowDown', table), ['a', 'b']);
    rowFocus.keepInRange(['a', 'b'], table);
    expect(rowFocus.focusedKey()).toBe('a');
    expect(table.focus).not.toHaveBeenCalled();
  });
});
