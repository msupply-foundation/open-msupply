/*
 * List-screen STATE for a plugin page (spec/plugins/sdk-contract.md § list &
 * table state): where a plugin table's sort, filters, page and column layout
 * live, so a plugin list screen remembers what a host one remembers.
 *
 * Two homes, the same two a host list screen uses
 * (spec/ui-standards/tables.md, kdd/url-structure, kdd/table-state):
 *
 *   the URL — filter, sort and page offset, in one `?query=` JSON parameter.
 *             Shareable, survives a reload, and restored by the browser's Back
 *             button — which is what lets a row click open a record and come
 *             back to the list as it was, rather than to a reset one.
 *   storage — the column LAYOUT (order, widths, pinning, visibility, plus
 *             density and card/table view), resolved default → global → user
 *             and held per breakpoint band.
 *
 * ── Why these are EAGER where a component would be lazy ──────────────────────
 * The SDK's heavy components are lazy wrappers (./lazyComponents.ts) because
 * every eager export is host startup weight (kdd/bundling). These are not
 * components, and the same reasoning points the other way: both must run in
 * the page's body on the FIRST render pass, before anything paints.
 *
 *   - URL state feeds the first FETCH. A screen whose read window derives from
 *     a date filter (the Cook Islands count log) would otherwise fetch the
 *     DEFAULT window, then refetch once the real state resolved — one wasted
 *     request on every load of a saved link.
 *   - Column config feeds DataTable's `config` at first paint. Arriving a tick
 *     late applies the user's stored widths as a visible jump, which is the
 *     opposite of what storing them was for.
 *
 * They are affordable on that account: measured as the MARGINAL cost over the
 * SDK's existing eager entry, the two together add ~1.3 kB gzipped — almost
 * everything they touch (the host query method, the store context) is already
 * in that graph. A component of that weight would still be lazy; a hook whose
 * whole job is to be ready before first paint cannot be.
 */
import { createTableConfig } from '../api/createTableConfig';
import type { TableConfigController } from '../api/createTableConfig';
import {
  hostSearchParam,
  setHostSearchParams,
} from '../nav/hostSearchParams';
import {
  createUrlQueryState,
  QUERY_PARAM,
} from '../list/urlQueryStateCore';
import type { UrlQueryState } from '../list/urlQueryStateCore';
import type { LayeredConfig } from '../ui/elements/table/tableConfig';

/**
 * A plugin list screen's filter, sort and page, kept in the URL — the host's
 * own list-state model (kdd/url-structure: one JSON `?query=` parameter), so a
 * plugin list behaves like a host one.
 *
 * What that buys, beyond a tidy address: the state survives a reload, a
 * narrowed list is a link someone can send, and — the reason a log whose rows
 * open a record needs it — the Back button returns the list the user left
 * rather than a reset one.
 *
 * `defaultState` is the pristine list. A state equal to it is spelt as the
 * ABSENCE of the parameter, so an untouched screen has a clean URL.
 *
 * Wired to the host's search binding rather than `useSearchParams`, so the
 * router stays out of the plugin surface (./tableState.ts header, and
 * src/nav/hostSearchParams.ts). Must be called under an owner (a component
 * body).
 */
export const createPluginUrlQueryState = <T extends object>(
  defaultState: T
): UrlQueryState<T> =>
  createUrlQueryState(defaultState, {
    read: () => hostSearchParam(QUERY_PARAM),
    write: (value, options) =>
      setHostSearchParams(
        { ...options?.params, [QUERY_PARAM]: value },
        { push: options?.push }
      ),
  });

/**
 * A plugin table's persisted identity: `${pluginCode}.${tableId}`.
 *
 * The same namespacing rule a contributed column's id follows (sdk-contract §
 * contributed columns — "identity is namespaced"), and for the same reason:
 * two plugins may each call a table `log` and keep their own stored layout,
 * and no plugin can reach the layout of a host table, whose ids are bare
 * (`stocktakes`, `names`). The stored key outlives the code that wrote it, so
 * this join is a contract, not an implementation detail — changing it orphans
 * every user's saved layout.
 */
export const pluginTableId = (pluginCode: string, tableId: string): string =>
  `${pluginCode}.${tableId}`;

/**
 * The column-layout controller for a plugin table — the host's own, under a
 * namespaced id.
 *
 * Feed the result straight into DataTable: `config`, `setConfig`,
 * `configIsDefault`, and `onSaveGlobalDefault` gated on
 * `canSaveGlobalDefault()` (pass the action only when that is true — the table
 * offers the control only when given the callback, and the server enforces the
 * permission regardless).
 *
 * `tableId` is the plugin's own name for the table, unique within the plugin
 * and STABLE — it is the storage key.
 *
 * Must be called under an owner (a component body).
 */
export const createPluginTableConfig = (options: {
  /** The calling plugin's code, as its manifest declares it. */
  pluginCode: string;
  /** This table's name within the plugin. Stable — it is the storage key. */
  tableId: string;
  /**
   * The lowest layer: the table's own defaults (start-hidden columns, a
   * compact-band card view), per breakpoint band. Bands do not inherit from
   * each other.
   */
  defaultConfig?: LayeredConfig;
}): TableConfigController =>
  createTableConfig({
    tableId: pluginTableId(options.pluginCode, options.tableId),
    defaultConfig: options.defaultConfig,
  });
