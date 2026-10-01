import { describe, expect, it } from 'vitest';
import { yLabelGutter } from './svgPlot';

// At the 0.75rem axis font on a 16px root.
const FONT_PX = 12;

describe('yLabelGutter', () => {
  it('keeps the default gutter for short labels', () => {
    expect(yLabelGutter(['0', '50', '100', '150'], FONT_PX)).toBe(34);
  });

  it('widens for a label longer than the default gutter holds', () => {
    // "4,000,000" renders about 55px wide at 12px; the gutter must hold it
    // plus the 6px gap to the plot.
    expect(
      yLabelGutter(['0', '1,000,000', '4,000,000'], FONT_PX)
    ).toBeGreaterThanOrEqual(62);
  });

  it('counts group and decimal marks as narrow', () => {
    // Same length, but a comma is narrower than a digit.
    expect(yLabelGutter(['1,000'], FONT_PX)).toBeLessThan(
      yLabelGutter(['10000'], FONT_PX)
    );
  });

  it('scales with the font size', () => {
    expect(yLabelGutter(['4,000,000'], 2 * FONT_PX)).toBeGreaterThan(
      yLabelGutter(['4,000,000'], FONT_PX)
    );
  });
});
