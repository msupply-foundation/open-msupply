import type {
  AllReportVersionsResult,
  AllReportVersionsVariables,
} from './manageReports.generated';

// The register's read state and the variables it maps onto
// (spec/manage-reports rules.md § the register, contract.md § the register).
// Pure — no reactivity — so the wire traps the register steers around are
// pinned by tests rather than by reading the screen.

/** The read's success branch — the connector, never remapped. */
type Connector = Extract<
  AllReportVersionsResult['allReportVersions'],
  { __typename: 'ReportConnector' }
>;

/** One register row: a single installed VERSION, not a report. */
export type ReportVersion = Connector['nodes'][number];

/**
 * The register's sort key type, straight off the generated variables. The
 * schema offers `id` too, but a column can only name a key the surface shows —
 * see SORTABLE_COLUMNS.
 */
export type ReportSortKey = NonNullable<
  AllReportVersionsVariables['sort']
>[number]['key'];

/** The filter object exactly as GraphQL expects it (kdd/type-safety). */
export type ReportFilter = NonNullable<AllReportVersionsVariables['filter']>;

/**
 * URL-backed register state (spec/ui-standards conventions § urls). Sort, page
 * and filter are exactly the generated GraphQL shapes — no parallel model.
 */
export type ReportRegisterState = {
  sort: NonNullable<AllReportVersionsVariables['sort']>;
  filter: ReportFilter;
  offset: number;
  first: number;
};

/**
 * Default order is by code, ascending (rules.md § the register) — the order
 * the reference app opens on, and it has to be SENT: the repository applies no
 * default of its own beyond the `id` tiebreaker.
 *
 * `first` is the register's own base page size, 20 (ui-surface S1 § Layout).
 */
export const DEFAULT_REGISTER_STATE: ReportRegisterState = {
  sort: [{ key: 'code', desc: false }],
  filter: {},
  offset: 0,
  first: 20,
};

/**
 * The read's variables.
 *
 * Two wire traps are steered around here, both recorded in contract.md:
 *
 *  - `storeId` AUTHORISES only. The row set is server-wide — nothing here
 *    treats the argument as a scope, and the screen must not present the
 *    register as the active store's (rules.md § the register).
 *  - The sort list is truncated to its FIRST entry, because the resolver pops
 *    the list and applies the LAST one. Sending two would silently sort by
 *    whichever ended up last, so exactly one entry always travels.
 *
 * An empty filter object is sent as `undefined` rather than `{}` so an unused
 * filter never appears in the serialised variables — which is what keeps the
 * resource key stable across a no-op filter edit.
 */
export const reportVariables = (
  storeId: string,
  userLanguage: string,
  state: ReportRegisterState
): AllReportVersionsVariables => ({
  storeId,
  userLanguage,
  filter: hasActiveFilter(state.filter) ? state.filter : undefined,
  sort: [state.sort[0] ?? DEFAULT_REGISTER_STATE.sort[0]],
  page: { first: state.first, offset: state.offset },
});

/** True when any filter member carries a value the server would act on. */
export const hasActiveFilter = (filter: ReportFilter): boolean =>
  Object.values(filter).some(value => value !== undefined && value !== null);

/**
 * The columns that can be sorted, in the register's own order.
 *
 * Status and Custom are absent deliberately: `ReportSortFieldInput` carries no
 * key for either, so declaring one is impossible by construction, and the
 * header offers no sort control for them (ui-surface S1 § columns).
 */
export const SORTABLE_COLUMNS = ['name', 'code', 'version'] as const;

/**
 * Whether a version is offered to the runner is NOT decided here — it is the
 * outcome of the runner's own version selection over the active candidates
 * (spec/reports § which version a user sees). The register only reports each
 * version's own active state, which is why this module exposes no "is this the
 * one in use" helper: it cannot know without the app version.
 */
export const isActive = (version: ReportVersion): boolean => version.isActive;
