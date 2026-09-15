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
   * The user's permissions in the entered store, as the wire's SCREAMING_SNAKE
   * `UserPermission` enum values (e.g. 'REQUISITION_MUTATE') — NOT the
   * PascalCase resource names the server's auth ERRORS carry
   * ('RequisitionMutate').
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

// ── The internal-orders new-order gate ──────────────────────────────────────
// The one CONSULTED slot: it renders nothing, ever. The host asks it a
// question at a defined moment instead of giving it a region to draw in
// (sdk-contract § the new-order gate slot).

/**
 * How a plugin supersedes the host's store-wide recent-stocktake warning at
 * New order (internal-orders rules § creation). The host consults every
 * visible gate contribution when New order is invoked with the warn
 * preference on; a gate answering `true` declares that its plugin carries an
 * item-level count-freshness measure for the entered store, so the store-wide
 * warning stands down and the create flow proceeds directly.
 *
 * `false` — and equally a thrown error or a rejected promise — leaves the
 * host's warning to its own preference-driven behaviour: a failing plugin can
 * never strip a store of the one measure it has (rules § error isolation).
 * The answer is per-store and MAY be asynchronous, because whether the
 * measure applies is typically the plugin's own data (the Cook Islands
 * counting schedule); the host awaits it inside the same in-flight state that
 * already covers its stocktake check.
 */
export type NewOrderGateResolver = (
  ctx: SlotContext
) => boolean | Promise<boolean>;

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
  // The gate has no props: nothing renders, so there is nothing to receive.
  // The empty entry only keeps the slot in the catalogue's uniform shape
  // (`SlotId = keyof SlotPropsMap`) — deliberately not a named, exported type,
  // which would publish a props DTO no plugin can ever be handed.
  'internalOrders.newOrderGate': Record<string, never>;
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
  // The gate is consulted, not placed: nothing renders, so there is nowhere
  // to anchor. `when(ctx)` and the resolver's own answer are its placement.
  'internalOrders.newOrderGate': NoPlacement;
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
  // The second departure from the uniform `Component` shape (the column
  // slot's `value` is the first): the gate renders nothing, so its whole
  // "render" is the answer it gives when consulted.
  'internalOrders.newOrderGate': { supersedes: NewOrderGateResolver };
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

// ── Pages & navigation ──────────────────────────────────────────────────────
// The page contribution — NOT a slot (sdk-contract § the page contribution):
// whole routed screens, each carrying its own routing, gating and (optional)
// menu placement, joined to the host's one navigation registry so the menu,
// the command palette, and the router can never disagree about them
// (rules § pages & navigation). A menu group is a menu object, not a page —
// it declares itself (`navSections`) and pages place themselves into it.

/**
 * The host's upper menu sections, as published placement targets — a plugin
 * page or nav section MAY place itself against (or, for a page, inside) one of
 * these ids (a section's id is its root path; Home's, whose path is empty, is
 * `'home'`). The pinned lower cluster (Catalogue, Manage, Settings, Help) is
 * not a target: plugin entries live in the upper list. A host-side test keeps
 * this list identical to the real menu, so it can never drift.
 */
export const HOST_NAV_SECTION_IDS = [
  'home',
  'replenishment',
  'inventory',
  'distribution',
  'dispensary',
  'cold-chain',
  'programs',
  'reports',
] as const;

/** A published host upper-section id — a nav placement target. */
export type HostNavSectionId = (typeof HOST_NAV_SECTION_IDS)[number];

/**
 * Where a page's navigation entry goes — one shape that covers every
 * placement, so a new placement is never a new registration key:
 *
 * - `{ in }` — inside a menu section: one of the plugin's own
 *   ({@link PluginNavSection} ids) or a published host section
 *   ({@link HOST_NAV_SECTION_IDS}). An id that is neither refuses the plugin
 *   at validation, by name. Inside a HOST section, `anchor` places the entry
 *   against the section's own entry ids (an entry's id is its store-relative
 *   path, e.g. `'inventory/stock'`); inside the plugin's own section, entries
 *   keep `pages` declaration order and `anchor` is not read.
 * - `{ root: true }` — a top-level entry in the menu's upper list, anchored
 *   against the published host section ids.
 *
 * Absent `nav` means routed with no menu entry (and no palette row) — a
 * detail-ish screen reached from the plugin's own UI, exactly like a host
 * record screen.
 *
 * An anchor naming an entry the store's gates currently hide degrades to the
 * container's end, named in plugin diagnostics — placement is a preference,
 * never a gate.
 */
export type PluginNavPlacement =
  | { in: HostNavSectionId | string; anchor?: Anchor<string>; root?: never }
  | { root: true; anchor?: Anchor<HostNavSectionId>; in?: never };

/** One routed screen a plugin contributes — a body, gates, and its address. */
export interface PluginPage {
  /** Unique within the plugin. */
  id: string;
  /**
   * The page's full store-relative path — URL segments (letters, digits, `-`,
   * `_`; each segment starts with a letter or digit). The SDK's own navigation
   * primitives take exactly this path; the page owns everything below it
   * (`stock-count/count/{something}` is the page's own to interpret). A path a
   * host destination already holds refuses the whole plugin at validation; one
   * an earlier plugin's page holds skips this page, visibly in diagnostics.
   */
  path: string;
  /**
   * The page's name — its breadcrumb, its browser-tab title, and its menu and
   * palette label when placed — as a key in the plugin's catalogue, never a
   * literal.
   */
  labelKey: PluginLocaleKey;
  /**
   * Loads the page's BODY component: called on first navigation to the page,
   * never at startup (AC-PLUG-P2), behind the host's route-level pending
   * boundary — `load: () => import('./CountPage')`. The host supplies the app
   * frame and page frame (header, breadcrumb, the menu); the component owns
   * only the body, receives no props, and fetches its own data through the
   * SDK, like a dashboard body contribution does.
   */
  load: () => Promise<{ default: Component }>;
  /**
   * Store-context withhold — the capability-class gate: while it fails, the
   * page is absent from the menu and the palette, and its URLs redirect to
   * the landing screen, exactly as a function the store does not have. Gate
   * POSITIVELY (`ctx.storeMode === 'dispensary'`) — see
   * {@link SlotContext.storeMode}. Composed with the gate of the plugin nav
   * section the page is placed in, where it is placed in one.
   */
  when?: (ctx: SlotContext) => boolean;
  /**
   * The permissions this page requires — ALL of them, as
   * {@link SlotContext.permissions}' own server names. The permission-class
   * gate, and the one condition behind both doors (AC-PLUG-P1): without them
   * the entries are absent, and the page's URL shows the host's no-permission
   * notice in place of the screen. Composed with its plugin nav section's,
   * where the page is placed in one.
   */
  permissions?: readonly string[];
  /** The menu placement; absent = routed, no menu entry. */
  nav?: PluginNavPlacement;
}

/**
 * A labelled menu group of the plugin's own — what the `navSections` key of a
 * plugin definition declares. Purely a menu object: it has no path and no
 * route of its own; pages join it by naming its id in their `nav.in`, and a
 * section no offered page is placed in simply does not render.
 */
export interface PluginNavSection {
  /** Unique within the plugin — the id pages name in `nav.in`. */
  id: string;
  /** The section's menu label — a key in the plugin's catalogue. */
  labelKey: PluginLocaleKey;
  /**
   * Where the section sits in the menu's upper list, against the published
   * host section ids ({@link HOST_NAV_SECTION_IDS}) — the one placement shape
   * every anchored surface uses. Absent (or `{ end: true }`) means the end of
   * the upper list, above the pinned lower cluster. An anchor naming a section
   * the store's gates currently hide degrades to the end, named in plugin
   * diagnostics — placement is a preference, never a gate.
   */
  anchor?: Anchor<HostNavSectionId>;
  /**
   * The group's capability-class gate, composed with each placed page's own:
   * while it fails, every page placed in the section is withheld everywhere —
   * menu, palette, and URL (redirect) — exactly as if each page's own `when`
   * failed.
   */
  when?: (ctx: SlotContext) => boolean;
  /**
   * The group's permission-class gate, composed with each placed page's own:
   * every named permission is required for every page placed in the section.
   */
  permissions?: readonly string[];
}

// ── The plugin module ───────────────────────────────────────────────────────

/** A flat message catalogue — `key` → template, `{{ token }}` interpolated. */
export type PluginMessages = Readonly<Record<string, string>>;

/**
 * What the author passes to `definePlugin`. `register` (the imperative escape
 * hatch) is not in v1 — it joins here when a host surface needs it.
 */
export interface PluginDefinition {
  manifest: PluginManifest;
  contributions?: readonly AnyContribution[];
  /**
   * Whole routed screens — a flat list of {@link PluginPage}s, each carrying
   * its own path, gates, and (optional) menu placement.
   */
  pages?: readonly PluginPage[];
  /**
   * The plugin's own labelled menu groups — the sections a page's
   * `nav: { in }` places it into.
   */
  navSections?: readonly PluginNavSection[];
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
