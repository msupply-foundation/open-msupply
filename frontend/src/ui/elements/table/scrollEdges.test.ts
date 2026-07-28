import { describe, expect, it } from 'vitest';
import { hiddenEdges } from './scrollEdges';

// A box 400 wide holding 1000 of content: 600 of scroll range.
const box = (scrollLeft: number) => ({
  scrollLeft,
  scrollWidth: 1000,
  clientWidth: 400,
});

describe('hiddenEdges', () => {
  it('reports neither edge when the content fits', () => {
    expect(
      hiddenEdges({ scrollLeft: 0, scrollWidth: 400, clientWidth: 400 }, false)
    ).toEqual({ left: false, right: false });
  });

  describe('LTR (scrollLeft 0 → max)', () => {
    it('hides only the right edge at rest', () => {
      expect(hiddenEdges(box(0), false)).toEqual({ left: false, right: true });
    });

    it('hides both edges mid-scroll', () => {
      expect(hiddenEdges(box(300), false)).toEqual({ left: true, right: true });
    });

    it('hides only the left edge at the end', () => {
      expect(hiddenEdges(box(600), false)).toEqual({
        left: true,
        right: false,
      });
    });
  });

  // RTL scrolls scrollLeft from 0 (fully right — the RTL "start") to -max. At 0
  // the number is identical to LTR's rest position but means the opposite, which
  // is why direction is an argument rather than inferred from the sign.
  describe('RTL (scrollLeft 0 → -max)', () => {
    it('hides only the LEFT edge at rest — the content sits off to the left', () => {
      expect(hiddenEdges(box(0), true)).toEqual({ left: true, right: false });
    });

    it('hides both edges mid-scroll', () => {
      expect(hiddenEdges(box(-300), true)).toEqual({ left: true, right: true });
    });

    it('hides only the right edge at the far end', () => {
      expect(hiddenEdges(box(-600), true)).toEqual({
        left: false,
        right: true,
      });
    });
  });

  it('treats a sub-pixel remainder as fully scrolled', () => {
    // Fractional column widths leave a fraction of a pixel at each end; without
    // the slack the shadow would never switch off.
    expect(hiddenEdges(box(0.4), false)).toEqual({ left: false, right: true });
    expect(hiddenEdges(box(599.4), false)).toEqual({
      left: true,
      right: false,
    });
  });
});
