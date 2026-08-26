import { DEFAULT_PAGE_SIZE } from '../../list/pageSize';
import type { LocaleKey } from '../../intl/locales';
import type {
  CliniciansVariables,
  CliniciansResult,
} from './clinicians.generated';

// Pure list logic for the Clinicians list (spec/clinicians, case
// OMS-FUN-DIS-004). Kept framework-free so the behaviour (store scope, the
// active-only rule, the sortable-column set, default order, pagination,
// variables shape, and the gender-label mapping) is unit-testable in node
// without a DOM. The list is read-only: it lists the active store's active
// clinicians and does nothing else.

// The generated GraphQL shapes, used verbatim (kdd/type-safety: no remapping).
export type CliniciansFilter = NonNullable<CliniciansVariables['filter']>;
export type CliniciansSort = CliniciansVariables['sort'];
export type ClinicianRow = CliniciansResult['clinicians']['nodes'][number];
export type Gender = NonNullable<ClinicianRow['gender']>;
// The GraphQL sort-field union offers nine keys; the list exposes only these
// four (OMS-FUN-DIS-004.5–.7, .15; rules › sorting). Mobile and gender are not
// sortable (OMS-FUN-DIS-004.17).
export type SortKey = Extract<
  NonNullable<CliniciansSort>[number]['key'],
  'code' | 'firstName' | 'lastName' | 'initials'
>;
export const SORTABLE_KEYS: readonly SortKey[] = [
  'code',
  'firstName',
  'lastName',
  'initials',
] as const;

// Pagination (rules › pagination; OMS-FUN-DIS-004.20): default 20, options
// 10/20/50/100.
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Active-only is the client's obligation: the server returns inactive
// clinicians unless asked not to (contract › which clinicians appear;
// OMS-FUN-DIS-004.10). Always sent, never a removable user chip.
export const ACTIVE_ONLY_FILTER: CliniciansFilter = { isActive: true };

// URL-backed list state. There is no user filter or search (rules › no
// filtering or search; OMS-FUN-DIS-004.21) — only sort and paging.
export type CliniciansListState = {
  sort?: CliniciansSort;
  offset: number;
  first: number;
};

// Default: active clinicians, sorted last name ascending (rules › sorting;
// OMS-FUN-DIS-004.16), first page of 20.
export const DEFAULT_STATE: CliniciansListState = {
  sort: [{ key: 'lastName', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// The full query variables, derived from URL state + the store in the path.
// storeId scopes the list server-side (rules › store scoping); the active-only
// filter is always applied; sort is a single-element list because the server
// honours only one entry (contract wire trap).
export const buildVariables = (args: {
  storeId: string;
  state: CliniciansListState;
}): CliniciansVariables => ({
  storeId: args.storeId,
  filter: ACTIVE_ONLY_FILTER,
  sort: args.state.sort,
  page: { first: args.state.first, offset: args.state.offset },
});

// Gender → its translated label key. The hormone/surgical transgender variants
// collapse onto the plain transgender-female/-male labels (rules › columns;
// OMS-FUN-DIS-004.13). A clinician with no gender shows an empty cell, so the
// caller handles null before reaching here.
export const genderLabelKey = (gender: Gender): LocaleKey => {
  switch (gender) {
    case 'FEMALE':
      return 'gender.female';
    case 'MALE':
      return 'gender.male';
    case 'NON_BINARY':
      return 'gender.non-binary';
    case 'TRANSGENDER':
      return 'gender.transgender';
    case 'TRANSGENDER_FEMALE':
    case 'TRANSGENDER_FEMALE_HORMONE':
    case 'TRANSGENDER_FEMALE_SURGICAL':
      return 'gender.transgender-female';
    case 'TRANSGENDER_MALE':
    case 'TRANSGENDER_MALE_HORMONE':
    case 'TRANSGENDER_MALE_SURGICAL':
      return 'gender.transgender-male';
    case 'UNKNOWN':
      return 'gender.unknown';
  }
};

// The list-view path for a store (rules › the list lives in Dispensary).
export const cliniciansListPath = (storeId: string): string =>
  `/${storeId}/dispensary/clinicians`;
