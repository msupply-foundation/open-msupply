import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COURSE_LIST_STATE,
  courseListVariables,
  demographicName,
  doseCount,
  inListOrder,
} from './courseList';

// Anchors: spec/immunisation-programs/acceptance.md — the program detail.
// OMS-REG-IMM-01.5  each row shows the name, the demographic's name and the
// live dose count OMS-REG-IMM-01.26  a course with no demographic shows a blank
// Target demographic OMS-REG-IMM-01.27  name ascending, case-insensitive, is
// the default order OMS-REG-IMM-01.28  the name sort reverses OMS-REG-IMM-01.30
//  the list holds this program's courses only OMS-REG-IMM-01.67  a bulk delete
// runs in list order

describe("OMS-REG-IMM-01.30 — the program's courses only", () => {
  it('filters the read by the program id', () => {
    expect(
      courseListVariables('prog-1', DEFAULT_COURSE_LIST_STATE).filter
    ).toEqual({ programId: { equalTo: 'prog-1' } });
  });
});

describe('OMS-REG-IMM-01.27 / OMS-REG-IMM-01.28 — the name sort, always sent, exactly one entry', () => {
  it('defaults to name ascending and pages by 20', () => {
    const variables = courseListVariables('prog-1', DEFAULT_COURSE_LIST_STATE);
    expect(variables.sort).toEqual([{ key: 'name', desc: false }]);
    expect(variables.page).toEqual({ first: 20, offset: 0 });
  });

  it('reverses, and truncates a multi-entry list to its FIRST entry (the resolver applies the last — wire trap)', () => {
    expect(
      courseListVariables('prog-1', {
        ...DEFAULT_COURSE_LIST_STATE,
        sort: [
          { key: 'name', desc: true },
          { key: 'name', desc: false },
        ],
      }).sort
    ).toEqual([{ key: 'name', desc: true }]);
  });

  it('falls back to the default sort for an empty list from a hand-edited URL', () => {
    expect(
      courseListVariables('prog-1', { ...DEFAULT_COURSE_LIST_STATE, sort: [] })
        .sort
    ).toEqual([{ key: 'name', desc: false }]);
  });
});

describe('OMS-REG-IMM-01.5 / OMS-REG-IMM-01.26 — the derived cells', () => {
  it('counts the live doses the read answers (none → 0)', () => {
    expect(doseCount({ vaccineCourseDoses: [{ id: 'a' }, { id: 'b' }] })).toBe(
      2
    );
    expect(doseCount({ vaccineCourseDoses: [] })).toBe(0);
    expect(doseCount({ vaccineCourseDoses: null })).toBe(0);
  });

  it("shows the demographic group's name, blank when the course has none", () => {
    expect(
      demographicName({ demographic: { id: 'g', name: 'Children' } })
    ).toBe('Children');
    expect(demographicName({ demographic: null })).toBe('');
  });
});

describe('OMS-REG-IMM-01.67 — a selection in list order', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('orders the selected ids as the rows are shown, whatever order they were ticked in', () => {
    expect(inListOrder(['c', 'a'], rows)).toEqual(['a', 'c']);
  });

  it('keeps a selected id that is no longer on the page, after the shown ones', () => {
    expect(inListOrder(['zz', 'b'], rows)).toEqual(['b', 'zz']);
  });
});
