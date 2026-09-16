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
 * This is the v1 surface. `register` and lazy component wrappers are later.
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
  PluginPage,
  PluginNavPlacement,
  PluginNavSection,
  HostNavSectionId,
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

// ── Auth & context ──────────────────────────────────────────────────────────
/*
 * The session surface (sdk-contract § SDK surface — Auth & context): the same
 * facts a contribution's `when(ctx)` receives, as a plain accessor for code
 * that runs OUTSIDE a gate — above all a contribution's own core-schema reads,
 * which need the entered store id as a query variable (`storeId: String!`
 * everywhere on the schema; graphqlQuery injects nothing). Reactive: it reads
 * the store-context signals fresh on every call, so a resource keyed on
 * `slotContext().storeId` re-fetches on a store switch, and every field an
 * unresolved session cannot answer is `undefined` — the same no-guessing rule
 * the gates rely on. Costs nothing eager: the store context is already in
 * this barrel's graph (navigation.ts reads it).
 */
export { slotContext } from '../plugins/slotContext';

// ── Slot API — the internal-order line slots ────────────────────────────────
export type {
  InternalOrderLineView,
  InternalOrderView,
  InternalOrderLineInfoPanelProps,
  InternalOrderSidePanelSectionProps,
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
// The expiry field on the Stocktake Helper's count screen (#495), which was
// hand-rolling a native <input type="date"> for want of this — per-browser
// chrome and a forced yyyy-MM-dd, where the host's field is a corvu calendar
// that renders the same everywhere and follows the display `format`.
// kdd/bundling files date pickers under the lazy() wrappers, but that rule is
// for components the startup path does not already carry. This one it does:
// FilterBar statically imports DateRangeField/DateTimeField, so DatePickerPanel
// (with @corvu/calendar) is modulepreloaded from index.html already, and
// DateField with it. Measured: the SDK-only startup delta moves 4.7 -> 4.8 KB
// gz and no new stylesheet is linked. Revisit if the eager path ever sheds the
// calendar — then this becomes the first lazy() wrapper.
export { DateField } from '../ui/elements/inputs/DateField';
export type { DateFieldProps } from '../ui/elements/inputs/DateField';
export { FieldRow } from '../ui/elements/inputs/FieldRow';
export { Select } from '../ui/elements/selectors/Select';
export type { SelectOption } from '../ui/elements/selectors/Select';
export { FormColumn } from '../ui/layout/Form/FormColumn';
export { FormColumns } from '../ui/layout/Form/FormColumns';
export { FormSection } from '../ui/layout/Form/FormSection';
export type { FormSectionProps } from '../ui/layout/Form/FormSection';
export { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
export type { ContentContainerProps } from '../ui/layout/ContentContainer/ContentContainer';
// The settings-form set — what the Stocktake Helper's Settings screen needs
// (plugins/cook_islands, #489): save/discard actions, the numeric thresholds,
// the item search box, and the per-item Priority toggle.
// NumberField and TextField are already in this barrel's graph (CurrencyField
// wraps NumberField, which renders through TextField), so exporting them keeps
// two modules alive that ship regardless; Button and ToggleSwitch are new
// CSS-bearing modules in the SDK chunk (measured: kdd/bundle-size-by-pr).
export { Button } from '../ui/elements/buttons/Button';
export type { ButtonProps } from '../ui/elements/buttons/Button';
export { SaveButton } from '../ui/elements/buttons/StandardButtons';
export { NumberField } from '../ui/elements/inputs/NumberField';
export type { NumberFieldProps } from '../ui/elements/inputs/NumberField';
export { TextField } from '../ui/elements/inputs/TextField';
export type { TextFieldProps } from '../ui/elements/inputs/TextField';
export { ToggleSwitch } from '../ui/elements/inputs/ToggleSwitch';
export type { ToggleSwitchProps } from '../ui/elements/inputs/ToggleSwitch';
export { matchesSearch } from '../ui/utils/searchText';
export { SidePanelSection } from '../ui/layout/SidePanel/SidePanel';
export type { SidePanelSectionProps } from '../ui/layout/SidePanel/SidePanel';

// ── UI kit — icons that carry meaning ───────────────────────────────────────
/*
 * The five the Cook Islands navigator names for its tiles (plugins/cook_islands
 * ui-surface.md § S2/S3): patient, open package, truck, document, stock — in
 * that order below. That file describes the PICTURE and never names an
 * export, so this list is the mapping; keep the two in step.
 * Re-exported rather than copied into the plugin, so a fix to a path, an RTL
 * flip or an a11y attribute on the host icon reaches the contributed surface
 * too — a copied SVG would fork on the first such change.
 *
 * Cheap because '../ui/icons' is ALREADY in this barrel's graph: InfoTooltip
 * pulls InfoIcon and Select pulls CheckIcon/ChevronDownIcon/CloseIcon, both
 * eager. So this keeps six more small components alive in a module that ships
 * regardless — path data only, no new module (measured: kdd/bundle-size-by-pr).
 *
 * Not an open door to the whole barrel: it grows one icon at a time, for an
 * icon an audited plugin's specified surface names.
 */
export {
  CustomersIcon,
  ReplenishmentIcon,
  TruckIcon,
  FileIcon,
  StockIcon,
} from '../ui/icons';
/*
 * The standing "this opens something" chevron on a whole-row/whole-card
 * target — the Stocktake Helper's worklist rows (#495), which are cards whose
 * only affordance is the card itself. WidgetCard carries its own ArrowRightIcon
 * for exactly this job, but a worklist row is not a widget card, and a chevron
 * hand-drawn in the plugin would miss `data-flip-rtl` and so point the wrong
 * way in Arabic.
 *
 * Same "already in the graph" bargain as the five above — Select pulls
 * ChevronDownIcon from this module eagerly, so this is one more small
 * component in a module that ships regardless.
 */
export { ChevronRightIcon } from '../ui/icons';
// Needed to hold one in a typed table of tiles (Component<IconProps>); a type
// export, so it weighs nothing at runtime.
export type { IconProps } from '../ui/icons';

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
  dispensingListPath,
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
