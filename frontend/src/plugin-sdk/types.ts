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
}

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
// slots, one per nesting level. `internalOrderLine.column` and
// `internalOrderLine.infoPanel` join the maps below as their host surfaces
// land — a new slot is an additive change, a rename is an API-version bump.

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

// ── The slot catalogue ──────────────────────────────────────────────────────

/** Every slot id, and the props its contributions receive. */
export interface SlotPropsMap {
  'dashboard.widget': DashboardSlotProps;
  'dashboard.panel': DashboardSlotProps;
  'dashboard.stat': DashboardSlotProps;
  'internalOrderLine.column': ColumnCellProps<InternalOrderLineView>;
  'internalOrderLine.infoPanel': InternalOrderLineInfoPanelProps;
}

export type SlotId = keyof SlotPropsMap;

/**
 * The dashboard's slot ids — the three whose contributions are a PROPS-LESS
 * `Component`, and so are exactly what the shared props-less outlet renders. A
 * slot carrying props (the column slot) has its own host surface.
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
  'internalOrderLine.column': ColumnDeclaration<InternalOrderLineView>;
  'internalOrderLine.infoPanel': NoPlacement;
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
  'internalOrderLine.column': ColumnRender<InternalOrderLineView>;
  'internalOrderLine.infoPanel': {
    Component: Component<InternalOrderLineInfoPanelProps>;
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
