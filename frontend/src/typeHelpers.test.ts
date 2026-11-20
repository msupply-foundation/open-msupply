import { describe, expect, it } from 'vitest';
import { sameFetchedValue, shallowEqual } from './typeHelpers';

/*
 * The explicit dedup for a publisher that rebuilds its value on every load
 * (kdd/state-management decision 5): loadDictionary's compare-before-publish,
 * and the `equals` of storeScopedResource's noSuspense memo. The behaviour it
 * powers is asserted in loadDictionary.test.ts and
 * storeScopedResource.test.ts; these pin the comparator itself.
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

describe('shallowEqual', () => {
  it('compares item by item, in order', () => {
    expect(shallowEqual([1, 'a'], [1, 'a'])).toBe(true);
    expect(shallowEqual([1, 'a'], ['a', 1])).toBe(false);
  });

  it('treats null, undefined and [] as three different values', () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
    expect(shallowEqual(null, undefined)).toBe(false);
    expect(shallowEqual(null, [])).toBe(false);
    expect(shallowEqual(undefined, [])).toBe(false);
  });
});
