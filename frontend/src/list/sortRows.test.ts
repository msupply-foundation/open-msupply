import { describe, expect, it } from 'vitest';
import { sortRows } from './sortRows';

type Row = { name: string; qty: number };
const rows: Row[] = [
  { name: 'b', qty: 2 },
  { name: 'a', qty: 3 },
  { name: 'c', qty: 1 },
];
const value = (row: Row, key: 'name' | 'qty') => row[key];

describe('sortRows', () => {
  it('orders ascending by the sort key', () => {
    expect(sortRows(rows, { key: 'name', desc: false }, value)).toEqual([
      { name: 'a', qty: 3 },
      { name: 'b', qty: 2 },
      { name: 'c', qty: 1 },
    ]);
  });

  it('orders descending when desc is set', () => {
    expect(
      sortRows(rows, { key: 'qty', desc: true }, value).map(r => r.qty)
    ).toEqual([3, 2, 1]);
  });

  it('orders by the given comparator, in either direction', () => {
    const versions = [{ v: '2.10.0' }, { v: '2.9.0' }];
    const numeric = new Intl.Collator('en', { numeric: true });
    const compare = (a: string | number, b: string | number) =>
      numeric.compare(String(a), String(b));
    const byV = (row: { v: string }) => row.v;
    expect(
      sortRows(versions, { key: 'v', desc: false }, byV, compare).map(r => r.v)
    ).toEqual(['2.9.0', '2.10.0']);
    expect(
      sortRows(versions, { key: 'v', desc: true }, byV, compare).map(r => r.v)
    ).toEqual(['2.10.0', '2.9.0']);
  });

  it('returns a new array, leaving the input untouched', () => {
    const input = [...rows];
    const sorted = sortRows(input, { key: 'qty', desc: false }, value);
    expect(sorted).not.toBe(input);
    expect(input).toEqual(rows);
  });
});
