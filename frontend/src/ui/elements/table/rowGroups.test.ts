import { describe, expect, it } from 'vitest';
import { displayedRows, groupPositions } from './rowGroups';

// ui-standards § tables › grouped rows: a grouped column shows a value once per
// run of equal consecutive values, its cells joined across the run.

const flags = (values: unknown[]) =>
  groupPositions(values).map(
    p => `${p.continuesPrevious ? 'P' : '-'}${p.continuesNext ? 'N' : '-'}`
  );

describe('grouped rows — runs of equal values', () => {
  it('marks a run: the first opens it, the rest continue it, all but the last join the next', () => {
    expect(flags(['a', 'b', 'b', 'b', 'c'])).toEqual([
      '--',
      '-N',
      'PN',
      'P-',
      '--',
    ]);
  });
  it('groups only consecutive rows — a value seen again later starts a new run', () => {
    expect(flags(['a', 'b', 'a'])).toEqual(['--', '--', '--']);
  });
  it('never groups empty values', () => {
    expect(flags(['', '', null, undefined, undefined])).toEqual([
      '--',
      '--',
      '--',
      '--',
      '--',
    ]);
  });
  it('compares by text, so a number and its string group', () => {
    expect(flags([6, '6'])).toEqual(['-N', 'P-']);
  });
  it('handles no rows and one row', () => {
    expect(groupPositions([])).toEqual([]);
    expect(flags(['a'])).toEqual(['--']);
  });
});

// ui-standards § tables › row groups: rows gathered under an expandable group
// row; a group of one is drawn as its row.
interface FakeRow {
  id: string;
  getIsGrouped: () => boolean;
  getIsExpanded: () => boolean;
  subRows: FakeRow[];
}
const line = (id: string): FakeRow => ({
  id,
  getIsGrouped: () => false,
  getIsExpanded: () => false,
  subRows: [],
});
const group = (id: string, rows: FakeRow[], expanded = false): FakeRow => ({
  id,
  getIsGrouped: () => true,
  getIsExpanded: () => expanded,
  subRows: rows,
});
const ids = (rows: FakeRow[]) => displayedRows(rows).map(row => row.id);

describe('row groups — the rows drawn', () => {
  it('draws a collapsed group as its group row alone', () => {
    expect(ids([group('g', [line('a'), line('b')])])).toEqual(['g']);
  });
  it('follows an expanded group row with its rows', () => {
    expect(ids([group('g', [line('a'), line('b')], true)])).toEqual([
      'g',
      'a',
      'b',
    ]);
  });
  it('draws a group of one as that row, expanded or not', () => {
    expect(ids([group('g', [line('a')])])).toEqual(['a']);
    expect(ids([group('g', [line('a')], true)])).toEqual(['a']);
  });
  it('keeps ungrouped rows and the order of groups', () => {
    expect(
      ids([line('x'), group('g', [line('a'), line('b')], true), line('y')])
    ).toEqual(['x', 'g', 'a', 'b', 'y']);
  });
});
