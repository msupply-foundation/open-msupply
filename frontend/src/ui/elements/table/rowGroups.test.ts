import { describe, expect, it } from 'vitest';
import { groupPositions } from './rowGroups';

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
