import type {
  VaccineCourseRowsResult,
  VaccineCourseRowsVariables,
} from './immunisationPrograms.generated';

// The program detail's course list — its read state, variables and the two
// derived cells (spec/immunisation-programs rules.md § the program detail,
// contract.md § the program detail). Pure, so the wire traps are pinned by
// tests.

/** One course row — the generated node, never remapped (kdd/type-safety). */
export type CourseRow =
  VaccineCourseRowsResult['vaccineCourses']['nodes'][number];

/**
 * The list's sort key type — `VaccineCourseSortFieldInput` carries only
 * `name`, so Target demographic and Doses are unsortable by construction.
 */
export type CourseSortKey = NonNullable<
  VaccineCourseRowsVariables['sort']
>[number]['key'];

export type CourseListState = {
  sort: NonNullable<VaccineCourseRowsVariables['sort']>;
  offset: number;
  first: number;
};

/**
 * Name ascending, case-insensitive, twenty to a page (rules § the program
 * detail). The sort is always SENT: with none the server orders by id
 * (contract wire trap).
 */
export const DEFAULT_COURSE_LIST_STATE: CourseListState = {
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: 20,
};

/**
 * The read's variables: the program's courses only. The sort list is
 * truncated to its FIRST entry — the resolver applies the LAST entry of the
 * list it is sent, contrary to the argument's own description (contract wire
 * trap) — so exactly one entry always travels.
 */
export const courseListVariables = (
  programId: string,
  state: CourseListState
): VaccineCourseRowsVariables => ({
  filter: { programId: { equalTo: programId } },
  sort: [state.sort[0] ?? DEFAULT_COURSE_LIST_STATE.sort[0]],
  page: { first: state.first, offset: state.offset },
});

/** The Doses column: the count of LIVE doses (the read answers only those). */
export const doseCount = (row: Pick<CourseRow, 'vaccineCourseDoses'>): number =>
  row.vaccineCourseDoses?.length ?? 0;

/** The Target demographic column: the group's name, blank when none. */
export const demographicName = (row: Pick<CourseRow, 'demographic'>): string =>
  row.demographic?.name ?? '';

/**
 * A selection in LIST ORDER — the order a bulk delete runs in (rules §
 * deleting courses): the selected rows on the current page first, in the order
 * shown, then any selected id no longer on the page (a selection can outlive a
 * page change) in the order it was selected.
 */
export const inListOrder = (
  selectedIds: readonly string[],
  rows: readonly { id: string }[]
): string[] => {
  const selected = new Set(selectedIds);
  const onPage = rows.filter(row => selected.has(row.id)).map(row => row.id);
  const shown = new Set(onPage);
  return [...onPage, ...selectedIds.filter(id => !shown.has(id))];
};
