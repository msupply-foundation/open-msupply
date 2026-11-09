import { describe, expect, it } from 'vitest';
import { proportionFill } from '@/ui/elements/table/proportionFill';

// The proportion cell's two invisible-when-wrong rules (spec/ui-standards
// /components.md § Tables → proportion cell): an ABSENT proportion renders
// nothing, while a real 0 is a value and renders an empty bar. Confusing the
// two is the classic falsy-check bug — a `Show when={percentage}` would blank a
// genuinely empty location.

describe('proportionFill — when there is no proportion to show', () => {
  it('is undefined for an absent value', () => {
    expect(proportionFill(undefined)).toBeUndefined();
    expect(proportionFill(null)).toBeUndefined();
  });

  it('is undefined when the capacity was 0 (a division by zero reaches it as Infinity or NaN)', () => {
    expect(proportionFill((5 / 0) * 100)).toBeUndefined();
    expect(proportionFill((0 / 0) * 100)).toBeUndefined();
  });

  it('is undefined for a negative proportion', () => {
    expect(proportionFill(-10)).toBeUndefined();
  });
});

describe('proportionFill — the fill and its tone', () => {
  it('a real 0 is a value: an empty bar, not a blank cell', () => {
    expect(proportionFill(0)).toEqual({
      percentage: 0,
      width: 0,
      tone: 'normal',
    });
  });

  it('sizes the fill to the proportion', () => {
    expect(proportionFill(25)).toEqual({
      percentage: 25,
      width: 25,
      tone: 'normal',
    });
  });

  it('reads as near capacity above 80%, exactly full included (over needs to exceed 100)', () => {
    expect(proportionFill(80)?.tone).toBe('normal');
    expect(proportionFill(80.5)?.tone).toBe('near');
    expect(proportionFill(100)?.tone).toBe('near');
  });

  it('over capacity keeps the true percentage but fills the track only once', () => {
    expect(proportionFill(140)).toEqual({
      percentage: 140,
      width: 100,
      tone: 'over',
    });
  });
});
