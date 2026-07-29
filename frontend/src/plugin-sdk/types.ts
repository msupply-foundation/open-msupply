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
  /** The store the user has entered; undefined before the store guard resolves. */
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
 * The uniform shape every slot takes. `P` is the slot's prop DTO
 * (`SlotPropsMap`); a contribution hidden by `when` renders nothing and runs no
 * data fetch.
 */
export interface Contribution<P extends Record<string, unknown>> {
  /** Unique within (plugin code, slot). */
  id: string;
  /** Tie-break among contributions sharing a placement. */
  order?: number;
  /** Visibility gate over the session context. */
  when?: (ctx: SlotContext) => boolean;
  /** An ordinary Solid component receiving the slot's props. */
  Component: Component<P>;
}

// ── The dashboard slots ─────────────────────────────────────────────────────
// The proof surface for v1 (spec/dashboard/ui-surface.md § S3): three sibling
// slots, one per nesting level. `internalOrderLine.column` and
// `internalOrderLine.infoPanel` join the maps below as their host surfaces
// land — a new slot is an additive change, a rename is an API-version bump.

/** A published host id — `<widget>` / `<widget>.<panel>` / `<widget>.<panel>.<stat>`. */
export type DashboardWidgetId = string;
export type DashboardPanelId = string;
export type DashboardStatId = string;
export type DashboardPieceId =
  DashboardWidgetId | DashboardPanelId | DashboardStatId;

/** Where a contribution sits among its siblings; defaults to the container end. */
export type DashboardAnchor<Id extends string> =
  { after: Id } | { before: Id } | { end: true };

/*
 * Dashboard slot props are deliberately empty (sdk-contract § slot props —
 * deferred): a dashboard contribution is self-sufficient through the SDK's
 * data-access and context surfaces, so it fetches its own data rather than
 * receiving it. `Record<string, never>` (not `{}`) keeps the props type
 * assignable to Solid's bare `Component` at the host's outlet.
 */
export type DashboardSlotProps = Record<string, never>;

// ── The slot catalogue ──────────────────────────────────────────────────────

/** Every slot id, and the props its contributions receive. */
export interface SlotPropsMap {
  'dashboard.widget': DashboardSlotProps;
  'dashboard.panel': DashboardSlotProps;
  'dashboard.stat': DashboardSlotProps;
}

export type SlotId = keyof SlotPropsMap;

/**
 * The per-slot placement fields — what a contribution must say about WHERE it
 * goes. A panel names the widget it joins and a stat names the panel; both
 * accept a built-in id or another plugin piece's id, so nesting is uniform.
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
}

/**
 * One flat discriminated array element: `slot` is the discriminant, so
 * narrowing on it gives the right props and the right placement fields, and a
 * plugin declares all its contributions in ONE array (sdk-contract §
 * contributions).
 */
export type AnyContribution = {
  [S in SlotId]: { slot: S } & Contribution<SlotPropsMap[S]> & SlotPlacement[S];
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
  /** Registered under namespace = the plugin's code, layered under server overrides. */
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
