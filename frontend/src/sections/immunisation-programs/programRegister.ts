import { stripEmpty } from '@/typeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/list/pageSize';
import type {
  ImmunisationProgramsResult,
  ImmunisationProgramsVariables,
} from './immunisationPrograms.generated';

// The program list's read state and the variables it maps onto
// (spec/immunisation-programs rules.md § the program list, contract.md § the
// program list). Pure — no reactivity — so the wire traps the list steers
// around are pinned by tests rather than by reading the screen.

/** One list row — the generated node, never remapped (kdd/type-safety). */
export type ProgramRow =
  ImmunisationProgramsResult['programs']['nodes'][number];

/** The generated filter shape, used verbatim. */
export type ProgramFilter = NonNullable<
  ImmunisationProgramsVariables['filter']
>;

/**
 * The list's sort key type. `ProgramSortFieldInput` carries exactly one value,
 * so this is the literal `'name'`: a column can only ever name a real sort
 * key, which is what makes the Vaccine courses column unsortable by
 * construction.
 */
export type ProgramSortKey = NonNullable<
  ImmunisationProgramsVariables['sort']
>['key'];

/**
 * URL-backed list state (spec/ui-standards conventions § urls). Filter, sort
 * and page are exactly the generated GraphQL shapes.
 */
export type ProgramRegisterState = {
  filter: ProgramFilter;
  sort: NonNullable<ImmunisationProgramsVariables['sort']>;
  offset: number;
  first: number;
};

/**
 * Default order is by name ascending, case-insensitive — the only sort the
 * list has (rules § the program list). It has to be SENT: with no `sort` the
 * server falls back to `id` ascending (contract wire trap).
 *
 * `first` is the app-wide default page size (rules § the program list says
 * "the standard list page size"); the screen seeds the user's remembered
 * rows-per-page over it per visit, and a URL beats both (`@/list/pageSize`).
 */
export const DEFAULT_REGISTER_STATE: ProgramRegisterState = {
  filter: {},
  sort: { key: 'name', desc: false },
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * The read's variables. `storeId` AUTHORISES only — the list is
 * installation-wide and the argument scopes nothing (contract wire trap).
 *
 * `isImmunisation: true` is forced onto EVERY read: the list shows
 * immunisation programs only (rules § programs), and the flag is not a
 * user-facing filter. `stripEmpty` drops an added-but-empty name chip (held as
 * a null key) so the filter — and the serialised resource key built from these
 * variables — carries only live filters.
 */
export const programVariables = (
  storeId: string,
  state: ProgramRegisterState
): ImmunisationProgramsVariables => ({
  storeId,
  filter: { ...stripEmpty(state.filter), isImmunisation: true },
  sort: state.sort,
  page: { first: state.first, offset: state.offset },
});

/**
 * The Vaccine courses cell: the program's LIVE course names, comma-separated,
 * in the order the server answers them (creation order — the loader applies
 * no sort). Blank when the program has none — and the server says "none" as
 * `null`, never `[]` (contract wire trap), so both read as an empty cell.
 */
export const courseNames = (row: Pick<ProgramRow, 'vaccineCourses'>): string =>
  (row.vaccineCourses ?? []).map(course => course.name).join(', ');
