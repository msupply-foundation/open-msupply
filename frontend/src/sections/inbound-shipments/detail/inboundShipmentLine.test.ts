import { describe, expect, it } from 'vitest';
import { packDifference } from './inboundShipmentLine';

// The Difference figure's DIRECTION (spec/inbound-shipments/ui-surface.md
// § line table col 13, issue #562). The sign is the contract here: the
// reference app reads received − shipped, and a flipped subtraction reports
// an over-receipt as a shortfall without any other symptom.
describe('packDifference', () => {
  it('is positive when more arrived than the supplier declared', () => {
    expect(packDifference(80, 20)).toBe(60);
  });

  it('is negative when the delivery fell short', () => {
    expect(packDifference(90, 100)).toBe(-10);
  });

  it('is zero when the delivery matches what was declared', () => {
    expect(packDifference(10, 10)).toBe(0);
  });

  // Nothing declared ⇒ nothing to compare against. Distinct from 0, which
  // the surfaces render as a figure ("they match") rather than as a blank.
  it('is undefined when nothing was recorded as shipped', () => {
    expect(packDifference(10, null)).toBeUndefined();
    expect(packDifference(10, undefined)).toBeUndefined();
  });

  // A declared zero IS a declaration — the supplier said they sent none — so
  // it compares, and every received pack is an over-receipt against it. This
  // is the shape the reported shipment was in.
  it('compares against a declared zero rather than blanking', () => {
    expect(packDifference(80, 0)).toBe(80);
  });
});
