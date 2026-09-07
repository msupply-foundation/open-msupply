import { stripEmpty } from '@/typeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/list/pageSize';
import type { SensorsListVariables } from '../sensors.generated';

// The sensor list's URL-backed state and its mapping onto the GraphQL
// variables — extracted from the view so the store scoping, the active-only
// restriction, sort and pagination (AC-S1, AC-L1, AC-L7, AC-L8) are testable
// in node vitest. Filter and sort are exactly the generated GraphQL shapes
// (kdd/type-safety: no remapping).

export type SensorFilter = NonNullable<SensorsListVariables['filter']>;

/**
 * The sort keys the list offers. The generated union has exactly these two —
 * the other columns are unsortable because the schema's sort enum has no member
 * for them, not by a UI choice (AC-L2). Exported so the view's columns and the
 * test both read one list.
 */
export type SensorSortKey = NonNullable<
  SensorsListVariables['sort']
>[number]['key'];
export const SORTABLE_KEYS: readonly SensorSortKey[] = [
  'name',
  'serial',
] as const;

// The filter keys a user can set from the toolbar. `isActive` is deliberately
// NOT one of them: it is the active-only restriction, not a filter chip
// (rules › reading the list), so it is held apart and merged in at query time.
export type SensorUserFilter = Omit<SensorFilter, 'isActive' | 'id'>;

export type SensorsListState = {
  filter: SensorUserFilter;
  /**
   * The active-only restriction (AC-L7): on unless the user turns it off. Held
   * as a plain boolean rather than inside `filter` so it can never be removed
   * as a chip, and so the URL reads `activeOnly:false` rather than a filter
   * shape.
   */
  activeOnly: boolean;
  sort?: SensorsListVariables['sort'];
  offset: number;
  first: number;
};

// Default: active sensors only, ordered by serial number descending (AC-L1,
// AC-L7). URL-backed, so a header click or the toggle overrides it.
//
// Serial number and Location are seeded PRESENT — `null` is an added-but-empty
// chip, which `stripEmpty` keeps out of the query — so they are on the bar from
// arrival with no menu step, as the surface describes (ui-surface S1 § filters:
// shown "always"). Sensor type is not: it is added from the filter menu.
export const DEFAULT_STATE: SensorsListState = {
  filter: { serial: null, locationCode: null },
  activeOnly: true,
  sort: [{ key: 'serial', desc: true }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * URL state + the active store → the query variables.
 *
 * - `storeId` scopes the list server-side (AC-S1); there is no store filter to
 *   widen it with.
 * - The active-only restriction becomes `filter.isActive = true`; turned off it
 *   sends nothing at all, so both active and inactive sensors return (AC-L8) —
 *   `isActive: false` would be an inactive-ONLY list, which the screen does not
 *   offer.
 * - `stripEmpty` drops added-but-empty filter chips so the query carries only
 *   live filters.
 * - `sort` is a single-element list: the server evaluates only the first entry.
 */
export const buildListVariables = (
  state: SensorsListState,
  storeId: string
): SensorsListVariables => ({
  storeId,
  filter: {
    ...stripEmpty(state.filter),
    ...(state.activeOnly ? { isActive: true } : {}),
  },
  sort: state.sort,
  page: { first: state.first, offset: state.offset },
});
