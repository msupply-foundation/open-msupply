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
 * This is the v1 surface. `pages`, `register`, navigation builders, and lazy
 * component wrappers are later.
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
  NoPlacement,
} from './types';

// ── Slot API — the internal-order line slots ────────────────────────────────
export type {
  InternalOrderLineView,
  InternalOrderView,
  InternalOrderLineInfoPanelProps,
  ColumnId,
  ColumnAnchor,
  ColumnValue,
  ColumnCellProps,
  ColumnDeclaration,
  ColumnRender,
  ColumnContribution,
} from './types';

// ── UI kit ──────────────────────────────────────────────────────────────────
/*
 * The host component library, re-exported so a contribution's markup IS host
 * markup — same look, same a11y contract, same tokens, and no CSS of its own to
 * ship (sdk-contract § styling). The set is deliberately small: every export
 * here is eager startup weight for plugin-bearing deployments and a per-PR
 * bundle-size event (kdd/bundling), so it grows only for a component an audited
 * plugin actually needs.
 *
 * These are the FIRST CSS-bearing SDK exports: their CSS modules land in the
 * SDK's own entry chunk, which the host links from index.html at build
 * (vite/sharedModules.ts) — a plugin never loads a stylesheet itself.
 */
export { Table } from '../ui/elements/table/Table';
export type { TableProps } from '../ui/elements/table/Table';
export { InfoTooltip } from '../ui/elements/feedback/InfoTooltip';
export type { InfoTooltipProps } from '../ui/elements/feedback/InfoTooltip';

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
