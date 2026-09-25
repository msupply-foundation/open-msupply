import { describe, expect, it } from 'vitest';
import { monthAxisFitsText } from './TargetQuantityBreakdown';

// 3.75rem on a 16px root.
const MIN_CELL_PX = 60;

describe('monthAxisFitsText', () => {
  it('hides text in an axis 5% of the row or narrower', () => {
    // A chart wide enough that even a 5% axis leaves a roomy cell (100px).
    expect(monthAxisFitsText(5, 1, 2000, MIN_CELL_PX)).toBe(false);
    expect(monthAxisFitsText(6, 1, 2000, MIN_CELL_PX)).toBe(true);
  });

  it('applies only the axis gate until the chart is measured', () => {
    expect(monthAxisFitsText(100, 24, undefined, MIN_CELL_PX)).toBe(true);
    expect(monthAxisFitsText(3, 1, undefined, MIN_CELL_PX)).toBe(false);
  });

  it('shows text when each cell is at least the minimum wide', () => {
    // 736px / 12 months ≈ 61px a cell.
    expect(monthAxisFitsText(100, 12, 736, MIN_CELL_PX)).toBe(true);
  });

  it('hides text when the months leave each cell too narrow', () => {
    // 736px / 24 months ≈ 31px a cell.
    expect(monthAxisFitsText(100, 24, 736, MIN_CELL_PX)).toBe(false);
  });

  it('sizes a cell from the axis share of the chart, not the whole chart', () => {
    // 50% of 736px over 6 months ≈ 61px; over 7 months ≈ 53px.
    expect(monthAxisFitsText(50, 6, 736, MIN_CELL_PX)).toBe(true);
    expect(monthAxisFitsText(50, 7, 736, MIN_CELL_PX)).toBe(false);
  });

  it('treats zero months as one', () => {
    expect(monthAxisFitsText(100, 0, 736, MIN_CELL_PX)).toBe(true);
  });
});
