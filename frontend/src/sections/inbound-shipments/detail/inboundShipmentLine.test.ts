import { describe, expect, it } from 'vitest';
import {
  batchIsBlank,
  expiryIsBlank,
  lacksBatchOrExpiry,
  packDifference,
} from './inboundShipmentLine';

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

// The batch/expiry prompt's trigger and marking (issue #992): per batch, a
// blank batch OR a blank expiry — either one alone is enough.
describe('batch and expiry blanks', () => {
  const full = { batch: 'B1', expiryDate: '2027-01-31' };

  it('a batch with both is not missing anything', () => {
    expect(batchIsBlank(full)).toBe(false);
    expect(expiryIsBlank(full)).toBe(false);
    expect(lacksBatchOrExpiry(full)).toBe(false);
  });

  it('a blank batch is missing its batch only', () => {
    const b = { ...full, batch: '' };
    expect(batchIsBlank(b)).toBe(true);
    expect(expiryIsBlank(b)).toBe(false);
    expect(lacksBatchOrExpiry(b)).toBe(true);
  });

  it('treats a whitespace-only batch as blank', () => {
    expect(batchIsBlank({ ...full, batch: '  ' })).toBe(true);
  });

  it('a blank expiry is missing its expiry only', () => {
    const b = { ...full, expiryDate: null };
    expect(batchIsBlank(b)).toBe(false);
    expect(expiryIsBlank(b)).toBe(true);
    expect(lacksBatchOrExpiry(b)).toBe(true);
  });
});
