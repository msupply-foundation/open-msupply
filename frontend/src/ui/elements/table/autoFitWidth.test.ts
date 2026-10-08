import { describe, expect, it } from 'vitest';
import {
  AUTO_FIT_MIN_PX,
  autoFitWidth,
} from '@/ui/elements/table/autoFitWidth';

// Double-clicking a column's resize divider snaps it to its widest content
// (issue #651). The measuring is the DOM's job; what's testable here is the
// bounding — the cases where a naive `Math.max` would either clip content or
// hand back a width the column can't use.

describe('autoFitWidth — fitting to the widest content', () => {
  it('takes the widest cell, header and footer included', () => {
    expect(autoFitWidth([120, 64, 210, 88], { current: 100 })).toBe(210);
  });

  it('rounds UP a fractional width — rounding down clips the widest cell', () => {
    expect(autoFitWidth([64, 137.4], { current: 100 })).toBe(138);
  });

  it('ignores cells that measured as nothing (a blank value in the column)', () => {
    expect(autoFitWidth([0, 96, 0], { current: 100 })).toBe(96);
  });
});

describe('autoFitWidth — bounds', () => {
  it('stops at the cap the cells already render under (past it they ellipsise anyway)', () => {
    expect(autoFitWidth([900], { current: 100, cap: 576 })).toBe(576);
  });

  it('leaves a width under the cap alone', () => {
    expect(autoFitWidth([210], { current: 100, cap: 576 })).toBe(210);
  });

  it('is unbounded when the column declares no cap (a wrapping column)', () => {
    expect(autoFitWidth([900], { current: 100 })).toBe(900);
  });

  it("never goes below TanStack's own drag floor", () => {
    expect(autoFitWidth([6], { current: 100 })).toBe(AUTO_FIT_MIN_PX);
    // …not even when the cap itself is narrower than the floor.
    expect(autoFitWidth([6], { current: 100, cap: 8 })).toBe(AUTO_FIT_MIN_PX);
  });
});

describe('autoFitWidth — nothing to measure', () => {
  it('keeps the current width when the column has no rendered cells', () => {
    expect(autoFitWidth([], { current: 140 })).toBe(140);
  });

  it('keeps the current width when every measurement is unusable', () => {
    expect(autoFitWidth([NaN, Infinity, -10], { current: 140 })).toBe(140);
  });
});
