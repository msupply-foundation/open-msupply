/*
 * The plugin module contract, as types (spec/plugins/sdk-contract.md).
 *
 * Everything here is public API for out-of-tree plugins: additive-only within
 * a PLUGIN_API_VERSION major, and a rename is a version bump. Type-only
 * module — it must stay free of runtime code so importing it costs nothing.
 */
import type { Component } from 'solid-js';
import type { SupportedLocale } from '../intl';

// ── Manifest ────────────────────────────────────────────────────────────────

export interface PluginManifest {
  /** == the plugin's package name; lower_snake_case; stable forever. */
  code: string;
  /** semver; the server's install-time gate reads this. */
  version: string;
  /** The SDK API this plugin was built against (PLUGIN_API_VERSION). */
  pluginApiVersion: number;
}

// ── Slot context ────────────────────────────────────────────────────────────

/*
 * The store preferences a contribution may gate on. SDK-owned (never the
 * host's generated preference node), so the plugin surface does not move when
 * the host's query does; the host maps it at the slot boundary. The set grows
 * as gating surfaces land — additive-only within an API major.
 */
export interface SlotStorePreferences {
  /** Gates the CIV aggregate-AMC surfaces on internal-order lines. */
  useConsumptionAndStockFromCustomersForInternalOrders: boolean;
  /**
   * The store's understock threshold, in months — the low-stock boundary.
   *
   * `undefined` until the store context resolves. There is no safe default
   * here: unlike the booleans above, whose safe default is OFF, a threshold
   * guessed wrong yields a figure that is confidently wrong, and a consumer
   * states the store's own value in its label. So a consumer waits for it
   * rather than substituting one — the same rule the dashboard holds itself
   * to, where an unresolved threshold pauses the fetch instead of sending
   * threshold-less variables (OMS-REG-DB-01.54).
   */
  monthsUnderstock: number | undefined;
}

/**
 * How the entered store is operated, as a domain word — SDK-owned (never the
 * host's generated `storeMode` enum), so the plugin surface does not move when
 * the host's query does; the host maps it at the slot boundary.
 */
export type SlotStoreMode = 'store' | 'dispensary';

/**
 * The session facts a contribution's `when` gate reads. Session-scoped only —
 * per-record gating belongs in the contribution's own render (sdk-contract §
 * contributions), so a store switch re-evaluates `when` but a row change does
 * not.
 */
export interface SlotContext {
  /**
   * The store the user has entered; undefined before the store guard resolves.
   */
  storeId: string | undefined;
  /**
   * The user's permissions in the entered store, as the server's PascalCase
   * `UserPermission` names (e.g. 'RequisitionMutate').
   */
  permissions: readonly string[];
  /**
   * How the entered store is operated; undefined until the store context
   * resolves — the mode is NOT yet known, and is never guessed.
   *
   * Gate POSITIVELY (`ctx.storeMode === 'dispensary'`): a positive gate is off
   * while the mode is unresolved, so a gated surface never flashes in before
   * its store's mode is known. A negated gate (`!== 'dispensary'`) is true in
   * that window and does flash.
   */
  storeMode: SlotStoreMode | undefined;
  storePreferences: SlotStorePreferences;
}

// ── Contributions ───────────────────────────────────────────────────────────

/**
 * What every contribution carries, whatever its slot — identity, tie-break, and
 * the visibility gate. A contribution hidden by `when` renders nothing and runs
 * no data fetch.
 */
export interface ContributionCore {
  /** Unique within (plugin code, slot). */
  id: string;
  /** Tie-break among contributions sharing a placement. */
  order?: number;
  /** Visibility gate over the session context. */
  when?: (ctx: SlotContext) => boolean;
}

/**
 * The uniform shape every slot takes. `P` is the slot's prop DTO
 * (`SlotPropsMap`).
 *
 * A few slots accept a declarative alternative to `Component` (the
 * column slot's `value`), so the per-slot render fields live in
 * `SlotRender` and this type is the common case — the one an author reads
 * to learn the shape.
 */
export interface Contribution<
  P extends Record<string, unknown>,
> extends ContributionCore {
  /** An ordinary Solid component receiving the slot's props. */
  Component: Component<P>;
}

/**
 * A key in the PLUGIN's own message catalogue — never a host key. The host
 * resolves it under the plugin's namespace at render, so the same key can exist
 * in two plugins and in the host without colliding
 * (sdk-contract § internationalisation).
 */
export type PluginLocaleKey = string;

// ── The dashboard slots ─────────────────────────────────────────────────────
// The proof surface for v1 (spec/dashboard/ui-surface.md § S3): three sibling
// PIECE slots, one per nesting level, plus the screen-level `dashboard.body`,
// whose contribution IS the dashboard body rather than a piece within one.
// `internalOrderLine.column` and `internalOrderLine.infoPanel` join the maps
// below as their host surfaces land — a new slot is an additive change, a
// rename is an API-version bump.

/**
 * A published host id — `<widget>` / `<widget>.<panel>` /
 * `<widget>.<panel>.<stat>`.
 */
export type DashboardWidgetId = string;
export type DashboardPanelId = string;
export type DashboardStatId = string;
export type DashboardPieceId =
  DashboardWidgetId | DashboardPanelId | DashboardStatId;

/**
 * Where a contribution sits among the host's published ids; defaults to the
 * container end. ONE shape for every anchored surface — dashboard
 * regions, table columns — so an author learns placement once.
 */
export type Anchor<Id extends string> =
  { after: Id } | { before: Id } | { end: true };

/** The dashboard's anchor (a published widget / panel / stat id). */
export type DashboardAnchor<Id extends string> = Anchor<Id>;

/**
 * The placement of a slot the HOST positions: nothing to declare. Used where a
 * region holds one fixed place in a screen rather than a row of siblings to
 * anchor against.
 */
export type NoPlacement = Record<never, never>;

/*
 * Dashboard slot props are deliberately empty (sdk-contract § slot props —
 * deferred): a dashboard contribution is self-sufficient through the SDK's
 * data-access and context surfaces, so it fetches its own data rather than
 * receiving it. `Record<string, never>` (not `{}`) keeps the props type
 * assignable to Solid's bare `Component` at the host's outlet.
 *
 * ONE type for all four dashboard slots, the body included: which stores get a
 * contributed body is `when(ctx)`'s answer, and the store mode and preferences
 * it turns on reach the contribution as session context, so there is nothing
 * for props to carry there either.
 */
export type DashboardSlotProps = Record<string, never>;

// ── The internal-order line slots ───────────────────────────────────────────
// The line table of an internal order (a request requisition) publishes a
// stable id per column, and a plugin adds columns anchored to them; the line
// editor takes a read-only info panel over the same line.
// NOT `requisitionLine.*`: a customer requisition is a different screen with a
// different DTO, and gets its own slot ids.

/**
 * One internal-order line, as the SDK publishes it — an SDK-OWNED view DTO,
 * mapped from host data at the slot boundary (sdk-contract § SDK surface), so
 * the plugin surface does not move when the host's query does. Read-only:
 * quantities are in the line's own UNITS, exactly as stored, and formatting is
 * the plugin's (through the SDK's `formatNumber`).
 *
 * Additive-only within a `PLUGIN_API_VERSION` major.
 */
export interface InternalOrderLineView {
  /** The line's id — the key `loadData` returns its entries under. */
  readonly id: string;
  readonly itemId: string;
  readonly itemCode: string;
  readonly itemName: string;
  /** The item's unit name; absent when the item names none. */
  readonly unitName: string | undefined;
  readonly defaultPackSize: number;
  readonly isVaccine: boolean;
  /** Doses per unit; 0 on an item that declares none. */
  readonly dosesPerUnit: number;
  readonly comment: string | undefined;
  readonly requestedQuantity: number;
  readonly suggestedQuantity: number;
  readonly availableStockOnHand: number;
  readonly averageMonthlyConsumption: number;
  /** Available stock ÷ AMC; 0 when the line has no consumption. */
  readonly monthsOfStock: number;
  readonly initialStockOnHandUnits: number;
  readonly incomingUnits: number;
  readonly outgoingUnits: number;
  readonly lossInUnits: number;
  readonly additionInUnits: number;
  readonly expiringUnits: number;
  readonly daysOutOfStock: number;
  /** The variance reason recorded on the line, where it carries one. */
  readonly reason: string | undefined;
}

/** A published host column id — the anchor target (`HostColumnId`). */
export type ColumnId = string;

/** Where a contributed column sits; absent means the table's end. */
export type ColumnAnchor = Anchor<ColumnId>;

/** What a `value` column may return; `undefined`/`null` render blank. */
export type ColumnValue = string | number | null | undefined;

/**
 * The props a column contribution's `Component` receives — one cell.
 *
 * `Row` is the table's view DTO; `Data` is this row's entry from `loadData`,
 * `undefined` while the batch is in flight or when the loader returned no entry
 * for the row.
 */
export type ColumnCellProps<Row, Data = unknown> = {
  readonly row: Row;
  readonly data: Data | undefined;
  /** True while the page's `loadData` batch is in flight. */
  readonly isLoading: boolean;
};

/**
 * The column fields beyond the uniform core: where the column goes, how it
 * presents, and how it gets its data.
 */
export interface ColumnDeclaration<Row, Data = unknown> {
  /** Header text, as a key in the plugin's catalogue — never a literal. */
  header: PluginLocaleKey;
  /** Optional header explanation, as a key in the plugin's catalogue. */
  description?: PluginLocaleKey;
  anchor?: ColumnAnchor;
  /** Logical, so RTL-safe; `'end'` for numeric columns. */
  align?: 'start' | 'end';
  /**
   * A resting width in `rem` or `px` (e.g. `'8rem'`); else the host default.
   */
  width?: string;
  /**
   * A batched side-fetch, run ONCE per rendered page of rows (and on refetch),
   * outside component render, keyed by `InternalOrderLineView.id`. It MUST
   * tolerate any subset and order of rows. Cells read their value
   * synchronously from `data`; a contribution hidden by `when` never runs it.
   */
  loadData?: (rows: readonly Row[]) => Promise<Map<string, Data>>;
}

/**
 * How a column produces its cells — one of two, never both:
 *
 * - `value` — the declarative form: return the cell's value and the host
 *   renders it as one of its own number/text cells (locale-formatted,
 *   aligned per `align`). What a computed numeric column needs.
 * - `Component` — an ordinary Solid component per cell, for a column that needs
 *   markup (a link, a badge, a loading treatment of its own).
 */
export type ColumnRender<Row, Data = unknown> =
  | { value: (row: Row, data?: Data) => ColumnValue; Component?: never }
  | { Component: Component<ColumnCellProps<Row, Data>>; value?: never };

/**
 * A contribution to a line-table column slot — the uniform core plus the column
 * declaration plus one of the two render forms.
 */
export type ColumnContribution<Row, Data = unknown> = ContributionCore &
  ColumnDeclaration<Row, Data> &
  ColumnRender<Row, Data>;

// ── The internal-order line info panel ──────────────────────────────────────

/**
 * The internal order a line belongs to, as the SDK publishes it — the second
 * SDK-OWNED view DTO of this surface (sdk-contract § the info-panel slot),
 * mapped from host data at the slot boundary.
 *
 * Flattened and in domain words, so a plugin never meets a host enum or a
 * nested host node: an absent program / period / order type arrives as
 * `undefined` (a general order), never `null` or `''`. Read-only, like every
 * slot DTO; additive-only within a `PLUGIN_API_VERSION` major.
 */
export interface InternalOrderView {
  readonly id: string;
  /** The order's human-facing number — what the breadcrumb shows. */
  readonly requisitionNumber: number;
  /** The order's lifecycle stage, as a domain word. */
  readonly status: 'draft' | 'sent' | 'finalised';
  /**
   * True while the order accepts edits (a draft whose supplier is enabled).
   * A contribution is read-only decoration either way — this is context to
   * render WITH, never a licence to write.
   */
  readonly editable: boolean;
  /** The program behind the order; absent on a general order. */
  readonly programId: string | undefined;
  readonly programName: string | undefined;
  /** The program order type (e.g. 'Monthly'); absent on a general order. */
  readonly orderType: string | undefined;
  /** The program period; absent on a general order. */
  readonly periodId: string | undefined;
  readonly periodName: string | undefined;
  /** The order's months-of-stock thresholds, as stored. */
  readonly minMonthsOfStock: number;
  readonly maxMonthsOfStock: number;
  /** The supplier the order is placed with. */
  readonly supplierId: string;
  readonly supplierName: string;
}

/**
 * The props an `internalOrderLine.infoPanel` contribution receives: the line
 * being edited and the order it belongs to, both as published view DTOs.
 *
 * Both update IN PLACE as the user steps through lines (Save & next), so a
 * contribution MUST read them through `props` on every render rather than
 * destructuring them once — the host never remounts the panel for a prop
 * change (sdk-contract § the info-panel slot).
 *
 * A `type`, not an interface, so it carries an implicit index signature and is
 * usable as the `P` of the uniform `Contribution<P>` (as `ColumnCellProps` is).
 */
export type InternalOrderLineInfoPanelProps = {
  readonly line: InternalOrderLineView;
  readonly order: InternalOrderView;
};

// ── The internal-order side-panel section ───────────────────────────────────
// The order DETAIL screen's side panel (internal-orders ui-surface § S8 ›
// side-panel section region) — the record-level surface of the info-panel
// kind: read-only decoration between the panel's own sections and its actions.

/**
 * The props an `internalOrder.sidePanelSection` contribution receives: the
 * order the side panel describes and its full line set, as published view
 * DTOs — the same views the line slots receive, so every internal-order
 * surface shows one order one way.
 *
 * Both update IN PLACE as the order changes under an open panel (a saved
 * line, a header save, a status change), so a contribution MUST read them
 * through `props` on every render rather than destructuring them once — the
 * host never remounts the section for a prop change (the info-panel props
 * carry the same rule).
 *
 * A `type`, not an interface, so it carries an implicit index signature and is
 * usable as the `P` of the uniform `Contribution<P>`.
 */
export type InternalOrderSidePanelSectionProps = {
  readonly order: InternalOrderView;
  /** Every line of the order — the detail screen's unpaginated set. */
  readonly lines: readonly InternalOrderLineView[];
};

// ── Form participation ──────────────────────────────────────────────────────
// The dirty/validity/veto/after-save handshake between a contribution and the
// editable host form it sits in (sdk-contract § form participation). Save
// order: every `onBeforeSave` (a throw ABORTS the save and surfaces its
// message) → the host persists → every `onAfterSave` is awaited before the
// save is reported complete.

/** A contribution's verdict on one of its own fields. */
export interface FieldValidity {
  valid: boolean;
  /** Shown by the host when invalid; a translated string, never a key. */
  message?: string;
}

/** What an after-save handler learns about the save that just happened. */
export interface SaveContext {
  /** The host record the form saved, by id — the natural `relatedRecordId`. */
  recordId: string;
}

/**
 * A contribution's own view of its host form's save cycle. Handlers registered
 * here bind to the calling component's Solid owner and are released with it, so
 * a contribution that leaves the screen can no longer affect a save
 * (rules § form participation).
 */
export interface FormParticipation {
  /** Mark the host form dirty (enables its save affordance). */
  setDirty: (dirty: boolean) => void;
  /** Gate the host's save on one of the contribution's own fields. */
  setValidity: (key: string, validity: FieldValidity) => void;
  /** Veto hook: throw to abort the save; the Error's message is surfaced. */
  onBeforeSave: (handler: () => void | Promise<void>) => void;
  /** Post-persist hook (e.g. write the contribution's own plugin data). */
  onAfterSave: (
    handler: (context: SaveContext) => void | Promise<void>
  ) => void;
}

// ── The prescription payment-form slot ──────────────────────────────────────
// The prescription payment window's form region (prescriptions ui-surface §
// S5: "A plugin slot may extend this form") — the first EDITABLE slot, so the
// first whose props carry `FormParticipation`.

/**
 * The prescription the payment window is settling, as the SDK publishes it —
 * an SDK-OWNED view DTO mapped from host data at the slot boundary
 * (sdk-contract § SDK surface). The money figures are the host's own rounded
 * derivation from invoice pricing and the selected insurance policy, so every
 * contribution sees the same numbers the host shows. Read-only; additive-only
 * within a `PLUGIN_API_VERSION` major.
 */
export interface PrescriptionPaymentView {
  /** The prescription (invoice) id — the natural `relatedRecordId` for a row. */
  readonly id: string;
  /** The prescription's human-facing number. */
  readonly invoiceNumber: number;
  /** Total after tax — the whole charge, before any insurance split. */
  readonly total: number;
  /** What the selected insurance policy covers; 0 when none is selected. */
  readonly totalToBePaidByInsurance: number;
  /** What the patient owes: `total` − `totalToBePaidByInsurance`. */
  readonly totalToBePaidByPatient: number;
}

/**
 * The props a `prescription.paymentForm` contribution receives: the
 * prescription being settled, and the contribution's own participation in the
 * window's save. `prescription` updates IN PLACE as the host recomputes the
 * split, so a contribution MUST read it through `props` on every render (the
 * info-panel props carry the same rule); `form` is one stable object per
 * contribution.
 *
 * A `type`, not an interface, so it carries an implicit index signature and is
 * usable as the `P` of the uniform `Contribution<P>`.
 */
export type PrescriptionPaymentFormProps = {
  readonly prescription: PrescriptionPaymentView;
  readonly form: FormParticipation;
};

// ── The slot catalogue ──────────────────────────────────────────────────────

/** Every slot id, and the props its contributions receive. */
export interface SlotPropsMap {
  'dashboard.widget': DashboardSlotProps;
  'dashboard.panel': DashboardSlotProps;
  'dashboard.stat': DashboardSlotProps;
  'dashboard.body': DashboardSlotProps;
  'internalOrderLine.column': ColumnCellProps<InternalOrderLineView>;
  'internalOrderLine.infoPanel': InternalOrderLineInfoPanelProps;
  'internalOrder.sidePanelSection': InternalOrderSidePanelSectionProps;
  'prescription.paymentForm': PrescriptionPaymentFormProps;
}

export type SlotId = keyof SlotPropsMap;

/**
 * The dashboard's PIECE slot ids — the three that contribute into a container
 * of host siblings, and so are exactly what the shared props-less outlet
 * renders at a region's tail. A slot carrying props (the column slot) has its
 * own host surface, and so does `dashboard.body`: its occupant replaces the
 * body rather than joining a region, so it is not one of these
 * (spec/dashboard/ui-surface.md § body-region semantics).
 */
export type DashboardSlotId =
  'dashboard.widget' | 'dashboard.panel' | 'dashboard.stat';

/**
 * The per-slot DECLARATION fields — everything a contribution says beyond the
 * uniform core and its rendering: above all WHERE it goes. A panel names the
 * widget it joins and a stat names the panel; both accept a built-in id or
 * another plugin piece's id, so nesting is uniform. A column names the header
 * and data facts its slot needs alongside its anchor.
 *
 * A slot whose position the HOST fixes declares nothing — the info panel's
 * region is one place in the line editor, so there is no anchor to name
 * (`NoPlacement`).
 */
export interface SlotPlacement {
  'dashboard.widget': { anchor?: DashboardAnchor<DashboardWidgetId> };
  'dashboard.panel': {
    widget: DashboardWidgetId;
    anchor?: DashboardAnchor<DashboardPanelId>;
  };
  'dashboard.stat': {
    panel: DashboardPanelId;
    anchor?: DashboardAnchor<DashboardStatId>;
  };
  // The body has no siblings to place itself among and no published ids inside
  // it: `when(ctx)` is the whole of its placement question.
  'dashboard.body': NoPlacement;
  'internalOrderLine.column': ColumnDeclaration<InternalOrderLineView>;
  'internalOrderLine.infoPanel': NoPlacement;
  // The side panel's region is one fixed place too — after the panel's own
  // sections, before its actions — so there is no anchor to name.
  'internalOrder.sidePanelSection': NoPlacement;
  'prescription.paymentForm': NoPlacement;
}

/**
 * The per-slot RENDER fields — how a contribution produces its output. Every
 * slot takes a `Component` over its props; the column slot additionally accepts
 * the declarative `value` form, and then `Component` is not given at all
 * (sdk-contract § the column slot).
 */
export interface SlotRender {
  'dashboard.widget': { Component: Component<DashboardSlotProps> };
  'dashboard.panel': { Component: Component<DashboardSlotProps> };
  'dashboard.stat': { Component: Component<DashboardSlotProps> };
  'dashboard.body': { Component: Component<DashboardSlotProps> };
  'internalOrderLine.column': ColumnRender<InternalOrderLineView>;
  'internalOrderLine.infoPanel': {
    Component: Component<InternalOrderLineInfoPanelProps>;
  };
  'internalOrder.sidePanelSection': {
    Component: Component<InternalOrderSidePanelSectionProps>;
  };
  'prescription.paymentForm': {
    Component: Component<PrescriptionPaymentFormProps>;
  };
}

/**
 * One flat discriminated array element: `slot` is the discriminant, so
 * narrowing on it gives the right props, the right declaration fields, and the
 * right render form, and a plugin declares all its contributions in ONE array
 * (sdk-contract § contributions).
 */
export type AnyContribution = {
  [S in SlotId]: { slot: S } & ContributionCore &
    SlotPlacement[S] &
    SlotRender[S];
}[SlotId];

// ── The plugin module ───────────────────────────────────────────────────────

/** A flat message catalogue — `key` → template, `{{ token }}` interpolated. */
export type PluginMessages = Readonly<Record<string, string>>;

/**
 * What the author passes to `definePlugin`. `pages` and `register` (the
 * imperative escape hatch) are not in v1 — they join here when a host surface
 * needs them.
 */
export interface PluginDefinition {
  manifest: PluginManifest;
  contributions?: readonly AnyContribution[];
  /**
   * Registered under namespace = the plugin's code, layered under server
   * overrides.
   */
  translations?: Partial<Record<SupportedLocale, PluginMessages>>;
  /** Built-in dashboard pieces to hide by published id (built-ins only). */
  suppress?: readonly DashboardPieceId[];
}

/**
 * The bundle's default export: a frozen, branded `PluginDefinition`. The brand
 * is what the loader validates before trusting the module (a bundle that
 * default-exports anything else is refused, named, and skipped).
 */
export interface PluginModule extends PluginDefinition {
  readonly kind: 'oms.plugin';
}
