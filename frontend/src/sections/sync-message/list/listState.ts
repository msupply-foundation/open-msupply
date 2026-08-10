import { stripEmpty } from '@/typeHelpers';
import type { GraphqlResult } from '@/api/graphql';
import type {
  SyncMessagesResult,
  SyncMessagesVariables,
} from './syncMessages.generated';
import type { SyncMessageFilter } from './listFilters';

/*
 * The register's URL-backed state and its mapping onto the GraphQL variables
 * (spec/sync-message/ui-surface.md S1; rules § listing, ordering and
 * filtering). Extracted from the view so the ordering / filtering / pagination
 * wiring is testable in node vitest. Filter and sort are exactly the generated
 * GraphQL shapes (kdd/type-safety: no remapping).
 */

export const DEFAULT_PAGE_SIZE = 20;

/** The sort keys the register offers, by the column that carries each
 *  (ui-surface S1 § columns). From store, To store and Type have NO server sort
 *  key and this app never reorders a page in the browser, so those columns are
 *  not sortable — logged as a backend gap (contract § backend gaps), not a
 *  divergence. The server's third key, `id`, names nothing on screen. */
export const SORT_KEYS = {
  created: 'createdDatetime',
  status: 'status',
} as const satisfies Record<string, SortKey>;

export type SortKey = NonNullable<SyncMessagesVariables['sort']>[number]['key'];

export type SyncMessagesListState = {
  filter: SyncMessageFilter;
  sort?: SyncMessagesVariables['sort'];
  offset: number;
  first: number;
};

/*
 * Default ordering: newest CREATED first — the server's own default, restated
 * here so the URL always carries the sort the table shows (OMS-REG-MNG-04.3).
 * Status is the screen's default FILTER chip: seeded present-but-empty (null,
 * FilterBar's "added but empty" marker), so it is on the bar from the start
 * and constrains nothing until a status is picked (ui-surface S1 § filters).
 */
export const DEFAULT_STATE: SyncMessagesListState = {
  filter: { status: null },
  sort: [{ key: SORT_KEYS.created, desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * URL state + the active store → the query variables.
 *
 * `storeId` is AUTHORISATION only — it does not scope the result (contract ⚠️
 * wire trap), and no store predicate is added here either, so the register
 * lists every message the server holds whichever store sent or received it,
 * including messages with no destination at all (OMS-REG-MNG-04.2).
 *
 * `page.first` is ALWAYS sent: omitting `page` entirely returns every row the
 * server holds (contract ⚠️ wire trap — pagination has a floor but no
 * ceiling). stripEmpty drops added-but-empty filter chips so the query carries
 * only live filters.
 */
export const buildListVariables = (
  state: SyncMessagesListState,
  storeId: string
): SyncMessagesVariables => ({
  storeId,
  filter: stripEmpty(state.filter),
  sort: state.sort,
  page: { first: state.first, offset: state.offset },
});

/** One page of the register, as the read returns it. */
export type RegisterPage =
  SyncMessagesResult['centralServer']['syncMessage']['syncMessages'];

/**
 * The page a read produced, or `undefined` when it did NOT produce one
 * (OMS-REG-MNG-04.29). A failed register read leaves the previous page on
 * screen — but the screen must also SAY the list did not refresh, since a
 * silently stale table is indistinguishable from a filter that matched
 * everything (D97). Distinguishing the two is exactly what this returns: the
 * view keeps its last page and raises the stale notice on `undefined`.
 *
 * `SyncMessageListResponse` is a single-member union, so a list failure — a
 * bad filter shape, a pagination bound, a permission refusal — can only arrive
 * as a top-level error, never as a response branch (contract ⚠️ wire trap).
 * There is therefore nothing else to inspect: a non-success result IS the
 * failure.
 */
export const pageFromResult = (
  result: GraphqlResult<SyncMessagesResult>
): RegisterPage | undefined =>
  result.kind === 'success'
    ? result.data.centralServer.syncMessage.syncMessages
    : undefined;
