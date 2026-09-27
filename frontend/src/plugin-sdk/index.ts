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

// ── Document types — the base shapes a form plugin extends ─────────────────
// A form plugin's document type extends one of these, and its JSON Schema is
// emitted from that type at build (./documents.ts). Type-only, so erased at
// build: nothing here is eager weight.
export type {
  DocumentData,
  Patient,
  Person,
  Gender,
  MaritalStatus,
  Note,
  NextOfKin,
  Address,
  ContactDetails,
  SocioEconomics,
  RelatedPerson,
  DrugAllergy,
  Allergies,
  ProgramEnrolment,
  ProgramEnrolmentStatus,
  Encounter,
  EncounterStatus,
  Clinician,
  User,
  EncounterLocation,
  ContactTrace,
  ContactTraceLocation,
} from './documents';

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

// ── Slot API — warning suppression ──────────────────────────────────────────
// The catalogue const is exported alongside its type: the spec commits
// "HOST_WARNING_IDS in the SDK is the committed set" (sdk-contract § the
// warning-suppression slot), and it is a handful of string literals — no
// eager weight.
export { HOST_WARNING_IDS } from './types';
export type { HostWarningId, WarningSuppressionResolver } from './types';

// ── Slot API — the prescription payment-form slot ───────────────────────────
export type {
  FieldValidity,
  FormParticipation,
  SaveContext,
  PrescriptionPaymentView,
  PrescriptionPaymentFormProps,
} from './types';

// ── Slot API — the document form slots ──────────────────────────────────────
// A program record's body, per category: the form a plugin contributes for
// one of its document types, written with the form library below.
export type {
  DocumentFormSlotId,
  DocumentFormPlacement,
  FormRecordView,
  ProgramEnrolmentFormProps,
  EncounterFormProps,
  PatientFormProps,
} from './types';

// ── Slot API — the patient toolbar trigger slot ─────────────────────────────
// A button on the patient screen's header: the host draws it from the
// trigger's label and icon, and runs its handler with the host actions.
export type {
  TriggerRender,
  TriggerPatientView,
  PatientTriggerProps,
  PatientTriggerActions,
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
// The two-up row, for the demo program's forms (#468): a field with its
// Generate button, weight beside height (kdd/form-layout). Already in the
// eager graph (the patient details form renders it), so it adds nothing new.
export { FormRow } from '../ui/layout/Form/FormRow';
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
/*
 * The registry's notice-inside-content panel (UI_ELEMENTS § Alert), for the
 * Stocktake Helper's save refusals and save failure (#495's review round:
 * plain red text at the card's corner was read past). The "already in the
 * eager graph" bargain again — App.tsx renders the startup failure through
 * Alert, statically, so the module and its CSS ship regardless.
 */
export { Alert } from '../ui/elements/feedback/Alert';
export type { AlertProps, AlertSeverity } from '../ui/elements/feedback/Alert';
/*
 * The confirm-before-acting dialog, for the demo program's enrolment ID
 * generator, which confirms before replacing an ID already given (#468). The
 * same bargain: the app shell (nav/ShellLayout.tsx) renders it statically, so
 * the module, its Dialog and their CSS ship regardless.
 */
export { ConfirmDialog } from '../ui/elements/feedback/ConfirmDialog';
export type { ConfirmDialogProps } from '../ui/elements/feedback/ConfirmDialog';
// foldForSearch rides along free: it is matchesSearch's own module, already
// eager — exported so a plugin filtering thousands of rows can fold its query
// once per pass instead of paying matchesSearch's per-call query fold.
export { foldForSearch, matchesSearch } from '../ui/utils/searchText';
export { SidePanelSection } from '../ui/layout/SidePanel/SidePanel';
export type { SidePanelSectionProps } from '../ui/layout/SidePanel/SidePanel';
// The date-range filter — what the Stocktake Helper's past-reports list needs
// (plugins/cook_islands, #490): a pick-only range whose `max` refuses future
// dates and whose pick flow cannot produce an inverted range. New CSS-bearing
// modules in the SDK chunk — the field, its DatePickerPanel and their shared
// styles (measured: kdd/bundle-size-by-pr).
export { DateRangeField } from '../ui/elements/inputs/DateRangeField';
export type {
  DateRangeFieldProps,
  IsoDateRange,
} from '../ui/elements/inputs/DateRangeField';

// ── UI kit — host-owned lazy wrappers ───────────────────────────────────────
/*
 * Heavy components load as their own host chunk on first render, never as
 * eager SDK weight (sdk-contract § code splitting; see ./lazyComponents.ts).
 * Added for the Stocktake Helper's Count log (#491) — a screen's own
 * sortable/resizable/paged row set is a DataTable, and its filtering is the
 * FilterBar chip model (spec/ui-standards/components.md § tables, § filter
 * bar). The type re-exports are erased at build, so they add nothing eager.
 */
export {
  DataTable,
  FilterBar,
  FilterDateRange,
  FilterSelect,
  FilterTextInput,
} from './lazyComponents';
export type { DataTableProps } from '../ui/elements/table/DataTable';
export type {
  Filter,
  FilterBarProps,
  FilterDateRangeProps,
  FilterDef,
  FilterSelectProps,
  FilterTextInputProps,
  RangeBounds,
} from '../ui/elements/selectors/FilterBar';
export type {
  Column,
  ColumnIdentity,
  SortState,
} from '../ui/elements/table/columnTypes';
export type {
  TableConfig,
  TableConfigKey,
} from '../ui/elements/table/tableConfig';
export type { PaginationProps } from '../ui/elements/table/Pagination';

// ── Form library — the fields a plugin form is written with ─────────────────
/*
 * Lazy like the table: the fields, the AJV validator and the host's default
 * forms are one host chunk, fetched when the first form opens (./
 * lazyComponents.ts; kdd/custom-forms/specs.md § Forms in the UI). A field
 * takes the draft the host hands a form and a path into the document type,
 * checked by the compiler. The types are erased at build.
 */
export {
  TextInput,
  TextAreaInput,
  NumberInput,
  DateInput,
  DateTimeInput,
  SelectInput,
  CheckboxInput,
  FieldGroup,
} from './lazyComponents';
// The host's patient fields, for a `patient.form` to compose: lazy from the
// same chunk.
export {
  PatientCodeField,
  PatientCode2Field,
  PatientFirstNameField,
  PatientLastNameField,
  PatientDateOfBirthField,
  PatientGenderField,
  PatientAddressField,
  PatientPhoneField,
  PatientNextOfKinField,
  PatientDeceasedFields,
} from './lazyComponents';
export type { PatientFieldProps } from '../domain/patient/documentFields';
export type { Draft } from '../domain/documentForm/draft';
export type {
  Path,
  PathValue,
  TextPath,
  EnumPath,
  NumberPath,
  BooleanPath,
} from '../domain/documentForm/paths';
export type { FieldSchemaInfo } from '../domain/documentForm/schemaNode';
// Migrations between a document type's schema versions: eager and tiny, since
// `defineMigration` only returns its argument, and the form contribution that
// lists the steps is read at load.
export { defineMigration } from './migrations';
export type {
  JsonScalar,
  Migration,
  MigrationStep,
  MigrationTransform,
} from '../domain/documentForm/migration';
export type {
  FieldProps,
  TextInputProps,
  TextAreaInputProps,
  NumberInputProps,
  DateInputProps,
  DateTimeInputProps,
  SelectInputProps,
  CheckboxInputProps,
  FieldGroupProps,
} from '../domain/documentForm/fields';

// ── List & table state — the URL and the stored column layout ───────────────
/*
 * Where a plugin list screen's state lives, so it remembers what a host one
 * remembers: filter/sort/page in the URL, column layout in storage (see
 * ./tableState.ts, which also records why these two are eager where a heavy
 * component is lazy — ~1.3 kB gzipped between them, and both must be ready
 * before first paint).
 */
export {
  createPluginTableConfig,
  createPluginUrlQueryState,
  pluginTableId,
} from './tableState';
export type { UrlQueryState } from '../list/urlQueryStateCore';
export type { TableConfigController } from '../api/createTableConfig';
export type { Band, LayeredConfig } from '../ui/elements/table/tableConfig';

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
// The back affordance on the Stocktake Helper's drill-in views (#490) —
// RTL-flipping, and already alive in this graph (the date picker's month
// navigation uses it), so re-exporting costs nothing.
export { ChevronLeftIcon } from '../ui/icons';
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
/*
 * The "this is done" mark on the Stocktake Helper's counted rows (#495's
 * visual tidy) — the same bargain again: Select pulls CheckIcon from this
 * module eagerly, so exporting it keeps one more already-shipped component
 * alive rather than adding anything.
 */
export { CheckIcon } from '../ui/icons';
/*
 * The host's create mark, for a trigger that records something new (the demo
 * program's "Record follow-up" on the patient header) — drawn beside the
 * host's own create actions, it should be the same mark. The same bargain as
 * the icons above: one more small component from a module the barrel already
 * ships.
 */
export { PlusCircleIcon } from '../ui/icons';
// The disclosure chevron, as the host's own accordions draw it (down,
// rotating 180° open) — the Cook Islands order-freshness statement's
// disclosure mirrors that look. Same bargain again: Select already pulls it
// eagerly, so re-exporting costs nothing new.
export { ChevronDownIcon } from '../ui/icons';
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
export { storeHref, navigateTo, currentStorePath } from './navigation';
export type { NavigateOptions } from './navigation';
export { usePageSearch } from './pageSearch';
export {
  DAYS_TILL_EXPIRED,
  expiredStockPath,
  expiringBetweenThresholdsStockPath,
  expiringNextThreeMonthsStockPath,
  expiringSoonStockPath,
  inboundShipmentListPath,
  internalOrderListPath,
  internalOrderPath,
  lowStockItemsPath,
  outboundShipmentListPath,
  outOfStockItemsPath,
  dispensingListPath,
  prescriptionListPath,
  stockListPath,
  stocktakeListPath,
  stocktakeDetailPath,
} from './deepLinks';

// ── Data access — the core schema ───────────────────────────────────────────
export { graphqlQuery } from './graphql';
export type {
  TypedDocument,
  GraphqlResult,
  GraphqlFailure,
  GraphqlErrorItem,
} from './graphql';

// ── Data access — program data ──────────────────────────────────────────────
// What a form plugin reads and draws beyond its own document: a server
// counter for generated identifiers, and the program events the server
// derives from documents (./programs.ts).
export { allocateProgramNumber, useActiveProgramEvents } from './programs';
export type { ProgramEventView, ActiveProgramEventsInput } from './programs';

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
