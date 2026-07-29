/*
 * @openmsupply/plugin-sdk — the host surface plugins compile against and
 * resolve at runtime through the import map (kdd/plugin-loading,
 * spec/plugins/sdk-contract.md).
 *
 * This is the sanctioned curated barrel: everything exported here is public
 * API for out-of-tree plugins, shared as ONE live instance via the
 * shared-module facade (src/plugin-runtime/shared/sdk.ts). Keep the eager
 * surface lean — every addition is startup weight for plugin-bearing
 * deployments and a per-PR bundle-size event (kdd/bundling).
 *
 * MUST stay free of module-scope side effects: this module is evaluated by
 * the facade entry before any plugin code runs.
 *
 * This is the v1 surface. The UI kit (Table, InfoTooltip) and the
 * internal-order line slot DTOs join it with their host surfaces; `pages`,
 * `register`, navigation builders, and lazy component wrappers are later still.
 */

// ── Compatibility gate ──────────────────────────────────────────────────────
export { PLUGIN_API_VERSION, PLUGIN_API_MIN_SUPPORTED } from './apiVersion';

// ── Slot API ────────────────────────────────────────────────────────────────
export { definePlugin } from './definePlugin';
export type {
  PluginManifest,
  PluginDefinition,
  PluginModule,
  PluginMessages,
  Contribution,
  ContributionCore,
  AnyContribution,
  PluginLocaleKey,
  Anchor,
  SlotId,
  SlotPropsMap,
  SlotPlacement,
  SlotRender,
  SlotContext,
  SlotStorePreferences,
  DashboardAnchor,
  DashboardSlotProps,
  DashboardWidgetId,
  DashboardPanelId,
  DashboardStatId,
  DashboardPieceId,
} from './types';

// ── Slot API — the internal-order line slots ────────────────────────────────
export type {
  InternalOrderLineView,
  ColumnId,
  ColumnAnchor,
  ColumnValue,
  ColumnCellProps,
  ColumnDeclaration,
  ColumnRender,
  ColumnContribution,
} from './types';

// ── Intl ────────────────────────────────────────────────────────────────────
export {
  pluginIntl,
  locale,
  isRtl,
  formatNumber,
  round,
  localisedDate,
  localisedTime,
  localisedDateTime,
} from './intl';
export type { PluginIntl, SupportedLocale } from './intl';

// ── Data access — the core schema ───────────────────────────────────────────
export { graphqlQuery } from './graphql';
export type {
  TypedDocument,
  GraphqlResult,
  GraphqlFailure,
  GraphqlErrorItem,
} from './graphql';

// ── Data access — the backend bridge ────────────────────────────────────────
export { pluginBridge, usePluginQuery } from './bridge';
export type { PluginBridge, PluginQuery } from './bridge';

// ── Data access — the plugin-data store ─────────────────────────────────────
export { pluginData, CONFIGURATION_IDENTIFIER } from './pluginData';
export type {
  PluginDataApi,
  PluginDataRecord,
  PluginDataPage,
  PluginDataQueryOptions,
  PluginDataWrite,
} from './pluginData';
