import { describe, expect, it } from 'vitest';
import { mirroredIssueValue } from './issueMirror';

describe('mirroredIssueValue (Issue field mirrors the grid — AC-AL16, OMS-REG-DIST-03.40)', () => {
  it('totals issued + placeholder under the units lens (the D61 requested total)', () => {
    expect(mirroredIssueValue(60, 40, { kind: 'units' })).toBe(100);
    expect(mirroredIssueValue(7, 0, { kind: 'units' })).toBe(7);
  });

  it('re-expresses the total through the packs lens, rounded to 2 dp for display', () => {
    expect(mirroredIssueValue(36, 0, { kind: 'packs', size: 12 })).toBe(3);
    // 10 units in packs of 3 → 3.333… → 3.33 (display rounding).
    expect(mirroredIssueValue(10, 0, { kind: 'packs', size: 3 })).toBe(3.33);
  });

  it('re-expresses the total through the doses lens', () => {
    expect(mirroredIssueValue(10, 5, { kind: 'doses', dosesPerUnit: 10 })).toBe(
      150
    );
  });

  it('mirrors a zeroed grid as 0 (e.g. an unusable-VVM pick zeroing the only allocated row)', () => {
    expect(mirroredIssueValue(0, 0, { kind: 'units' })).toBe(0);
  });
});
