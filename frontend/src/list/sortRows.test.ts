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

  it('returns a new array, leaving the input untouched', () => {
    const input = [...rows];
    const sorted = sortRows(input, { key: 'qty', desc: false }, value);
    expect(sorted).not.toBe(input);
    expect(input).toEqual(rows);
  });
});
