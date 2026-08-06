import { stripEmpty } from '@/typeHelpers';
import type { SitesVariables } from './sites.generated';

// The register's URL-backed state and its mapping onto the GraphQL variables
// (spec/sites/rules.md § the site register) — extracted from the view so the
// sort / filter / pagination wiring is testable in node vitest. Filter and sort
// are exactly the generated GraphQL shapes (kdd/type-safety: no remapping).

export const DEFAULT_PAGE_SIZE = 20;

/**
 * The sort keys the list may offer. `SiteSortFieldInput` declares three, but
 * `id` is **unusable**: every key goes through the case-insensitive sort
 * helper, which emits `COLLATE NOCASE` — invalid against an integer column —
 * so sorting by it fails the whole read with a DB error (contract.md ⚠️ wire
 * trap). Typed as an Extract of the generated union rather than a hand-written
 * literal, so this exclusion survives a schema change and cannot drift.
 */
export type SiteSortKey = Extract<
  NonNullable<SitesVariables['sort']>[number]['key'],
  'code' | 'name'
>;

export type SiteFilter = NonNullable<SitesVariables['filter']>;

export type SitesListState = {
  filter: SiteFilter;
  sort?: Array<{ key: SiteSortKey; desc?: boolean | null }>;
  offset: number;
  first: number;
};

/**
 * OMS-FUN-SYC-002.7 — name ascending until the user chooses otherwise (which
 * is the server's own default too, applied when no sort argument is sent).
 * URL-backed, so a header click overrides it and the whole view is shareable
 * and survives a reload (OMS-FUN-SYC-002.11).
 */
export const DEFAULT_STATE: SitesListState = {
  filter: {},
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * URL state → query variables.
 *
 * Exactly ONE sort input is ever sent: the field documents "only first sort
 * input is evaluated" but the resolver pops the TAIL of the vector, so with
 * several the LAST wins (contract.md ⚠️ wire trap). `stripEmpty` drops an
 * empty search so the query — and the resource's serialised key — carry only a
 * live filter, and the reported total stays the unfiltered one
 * (OMS-FUN-SYC-002.9).
 */
export const buildListVariables = (state: SitesListState): SitesVariables => ({
  filter: stripEmpty(state.filter),
  sort: state.sort,
  page: { first: state.first, offset: state.offset },
});

/**
 * OMS-FUN-SYC-002.9 — the one filter the screen offers: name **contains**,
 * case-insensitively. Code, exact-name and id filtering are contract-declared
 * and deliberately not surfaced (rules.md § the site register).
 */
export const nameSearchFilter = (search: string): SiteFilter =>
  search === '' ? {} : { name: { like: search } };

/** The text the search box shows for the current filter state. */
export const nameSearchValue = (filter: SiteFilter): string =>
  filter.name?.like ?? '';
