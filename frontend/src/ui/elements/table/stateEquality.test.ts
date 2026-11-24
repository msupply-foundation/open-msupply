import { describe, expect, it } from 'vitest';
import { shallowEqual } from '@/typeHelpers';
import { samePinning, sameRecord } from '@/ui/elements/table/stateEquality';

// These decide whether DataTable hands TanStack its old state or a new one
// (#1890). Calling equal state "different" makes TanStack rebuild every cell,
// and the table remounts every body cell; calling different state "equal"
// would hide a real change (a reorder, a hidden column) from the table.

describe('shallowEqual on a column list', () => {
  it('treats the same array, or two undefined, as equal', () => {
    const order = ['code', 'name'];
    expect(shallowEqual(order, order)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });

  it('treats a fresh array with the same items as equal', () => {
    expect(shallowEqual([], [])).toBe(true);
    expect(shallowEqual(['code', 'name'], ['code', 'name'])).toBe(true);
  });

  it('tells undefined apart from an empty array', () => {
    expect(shallowEqual(undefined, [])).toBe(false);
    expect(shallowEqual([], undefined)).toBe(false);
  });

  it('treats a different order or length as a change', () => {
    expect(shallowEqual(['code', 'name'], ['name', 'code'])).toBe(false);
    expect(shallowEqual(['code'], ['code', 'name'])).toBe(false);
  });
});

describe('sameRecord', () => {
  it('treats a fresh object with the same entries as equal, in any key order', () => {
    expect(sameRecord({}, {})).toBe(true);
    expect(sameRecord({ code: 80, name: 300 }, { name: 300, code: 80 })).toBe(
      true
    );
  });

  it('treats a changed value as a change', () => {
    expect(sameRecord({ code: 80 }, { code: 81 })).toBe(false);
    expect(sameRecord({ code: true }, { code: false })).toBe(false);
  });

  it('treats a key missing on one side as a change', () => {
    expect(sameRecord({ code: 80 }, {})).toBe(false);
    expect(sameRecord({ code: 80 }, { name: 80 })).toBe(false);
  });

  it('tells a missing key apart from a key set to undefined', () => {
    expect(
      sameRecord<boolean | undefined>(
        { code: undefined, name: true },
        { name: true, unit: undefined }
      )
    ).toBe(false);
  });
});

describe('samePinning', () => {
  it('treats fresh pinning with the same columns as equal', () => {
    expect(samePinning({}, {})).toBe(true);
    expect(
      samePinning(
        { left: ['code'], right: ['total'] },
        { left: ['code'], right: ['total'] }
      )
    ).toBe(true);
  });

  it('treats a column pinned, moved side or reordered as a change', () => {
    expect(samePinning({}, { left: ['code'] })).toBe(false);
    expect(samePinning({ left: ['code'] }, { right: ['code'] })).toBe(false);
    expect(
      samePinning({ left: ['code', 'name'] }, { left: ['name', 'code'] })
    ).toBe(false);
  });

  it('tells no side list apart from an empty one', () => {
    expect(samePinning({}, { left: [] })).toBe(false);
  });
});
