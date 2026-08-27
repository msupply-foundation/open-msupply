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
 * This is the v1 surface. `pages`, `register`, and lazy component wrappers
 * are later.
 */

// ── Compatibility gate ──────────────────────────────────────────────────────
// HOST_RUNTIME is deliberately NOT re-exported: it is host machinery, read by
// the loader and the pack step from './apiVersion' directly, and a plugin has
// no use for it — a bundle runs in exactly one host, and cannot choose or
// claim which (spec/plugins/rules.md § compatibility gates).
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
  SlotStoreMode,
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

// ── Slot API — the prescription payment-form slot ───────────────────────────
export type {
  FieldValidity,
  FormParticipation,
  SaveContext,
  PrescriptionPaymentView,
  PrescriptionPaymentFormProps,
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
// The clickable-titled-card role (registry: Widget card) — the navigator task
// tile (#317): whole-card <a>/<button> activation, accessible name, and the
// no-nested-interactive guarantee come from the host component, with the
// content slot taking the plugin's KPI block.
export { WidgetCard } from '../ui/elements/display/WidgetCard';
export type { WidgetCardProps } from '../ui/elements/display/WidgetCard';
export { InfoTooltip } from '../ui/elements/feedback/InfoTooltip';
export type { InfoTooltipProps } from '../ui/elements/feedback/InfoTooltip';
// The form set, added with the payment-form slot — the union of what the
// audited country plugins' FORM surfaces use
// (kdd/plugin-loading/evidence/interface-audits/).
export { CurrencyField } from '../ui/elements/inputs/CurrencyField';
export { FieldRow } from '../ui/elements/inputs/FieldRow';
export { Select } from '../ui/elements/selectors/Select';
export type { SelectOption } from '../ui/elements/selectors/Select';
export { FormColumn } from '../ui/layout/Form/FormColumn';
export { FormColumns } from '../ui/layout/Form/FormColumns';

// ── Intl ────────────────────────────────────────────────────────────────────
export {
  pluginIntl,
  locale,
  isRtl,
  formatNumber,
  round,
  roundTo,
  currencyDecimals,
  localisedDate,
  localisedTime,
  localisedDateTime,
} from './intl';
export type { PluginIntl, SupportedLocale } from './intl';

// ── Navigation ──────────────────────────────────────────────────────────────
/*
 * Reaching a host screen without knowing the entered store or the app's mount
 * — and without meeting `@solidjs/router`, which is not in the closed import
 * set (sdk-contract § imports). Two halves: the route/link primitives, and
 * the typed deep-link builders whose store-relative paths they take
 * (./deepLinks.ts — promoted from the dashboard's stat links, #304). The
 * builders' host-shared helpers (listPath, itemCataloguePath) are deliberately
 * NOT here: a raw (path, filter) pair is the hand-encoding the named builders
 * exist to prevent.
 */
export { storeHref, navigateTo } from './navigation';
export type { NavigateOptions } from './navigation';
export {
  DAYS_TILL_EXPIRED,
  expiredStockPath,
  expiringBetweenThresholdsStockPath,
  expiringNextThreeMonthsStockPath,
  expiringSoonStockPath,
  inboundShipmentListPath,
  internalOrderListPath,
  lowStockItemsPath,
  outboundShipmentListPath,
  outOfStockItemsPath,
  prescriptionListPath,
  stockListPath,
  stocktakeListPath,
} from './deepLinks';

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
// A plugin-data insert carries a client-minted row id; `crypto.randomUUID` is
// secure-context-only (crashes on plain-HTTP LAN origins, #499), so the host's
// generator is the sanctioned way for a plugin to mint one.
export { generateUUID } from '../uuid';
export type {
  PluginDataApi,
  PluginDataRecord,
  PluginDataPage,
  PluginDataQueryOptions,
  PluginDataWrite,
} from './pluginData';
