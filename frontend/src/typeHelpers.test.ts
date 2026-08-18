import { describe, expect, it } from 'vitest';
import { sameFetchedValue } from './typeHelpers';

/*
 * The explicit dedup for a publisher that rebuilds its value on every load
 * (kdd/state-management decision 5; loadDictionary is the one such site). The
 * publish-skipping behaviour it powers is asserted in loadDictionary.test.ts;
 * these pin the comparator itself.
 */
describe('sameFetchedValue', () => {
  it('treats structurally equal payloads as equal, and different ones as not', () => {
    expect(sameFetchedValue({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toBe(
      true
    );
    expect(sameFetchedValue({ a: 1 }, { a: 2 })).toBe(false);
    // Absent vs present is a real difference, not an equality.
    expect(sameFetchedValue({ a: 1 }, { a: 1, b: null })).toBe(false);
    expect(sameFetchedValue(undefined, undefined)).toBe(true);
    expect(sameFetchedValue(undefined, { a: 1 })).toBe(false);
  });
});
