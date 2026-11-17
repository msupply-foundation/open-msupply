import { describe, expect, it } from 'vitest';
import { monthCellPressed, pickGridTarget } from './MonthYearGrids';

/*
 * The date picker's month and year grids (./MonthYearGrids.tsx). No document
 * in this project (vitest.workspace.ts), so these test the logic the grids
 * render from: which cell a key moves focus to, and which cell is announced
 * as pressed.
 */

// A 12-cell grid (the month grid), 4 columns, with these cells disabled
const cells = (...disabled: number[]) =>
  Array.from({ length: 12 }, (_, i) => disabled.includes(i));

describe('pickGridTarget', () => {
  it('moves to the next cell with → in LTR and ← in RTL', () => {
    expect(pickGridTarget('ArrowRight', 5, cells(), false)).toBe(6);
    expect(pickGridTarget('ArrowLeft', 5, cells(), false)).toBe(4);
    expect(pickGridTarget('ArrowLeft', 5, cells(), true)).toBe(6);
    expect(pickGridTarget('ArrowRight', 5, cells(), true)).toBe(4);
  });

  it('moves a row with ↑ and ↓', () => {
    expect(pickGridTarget('ArrowDown', 5, cells(), false)).toBe(9);
    expect(pickGridTarget('ArrowUp', 5, cells(), false)).toBe(1);
  });

  it('skips disabled cells in the direction of travel', () => {
    expect(pickGridTarget('ArrowRight', 5, cells(6, 7), false)).toBe(8);
    expect(pickGridTarget('ArrowDown', 1, cells(5), false)).toBe(9);
  });

  it('stays put at the edge, or when every cell beyond is disabled', () => {
    expect(pickGridTarget('ArrowRight', 11, cells(), false)).toBeNull();
    expect(pickGridTarget('ArrowUp', 2, cells(), false)).toBeNull();
    expect(pickGridTarget('ArrowDown', 3, cells(7, 11), false)).toBeNull();
  });

  it('goes to the first and last enabled cells with Home and End', () => {
    expect(pickGridTarget('Home', 6, cells(0, 1), false)).toBe(2);
    expect(pickGridTarget('End', 6, cells(10, 11), false)).toBe(9);
  });

  it('leaves other keys to the browser', () => {
    expect(pickGridTarget('Enter', 5, cells(), false)).toBeUndefined();
    expect(pickGridTarget('Tab', 5, cells(), false)).toBeUndefined();
    expect(pickGridTarget('a', 5, cells(), false)).toBeUndefined();
  });
});

describe('monthCellPressed', () => {
  it('announces the picked month as pressed when the grid holds the value', () => {
    expect(monthCellPressed(true, true)).toBe('true');
    expect(monthCellPressed(true, false)).toBeUndefined();
  });

  it('sets no aria-pressed on a navigation grid', () => {
    expect(monthCellPressed(false, true)).toBeUndefined();
    expect(monthCellPressed(undefined, true)).toBeUndefined();
  });
});
