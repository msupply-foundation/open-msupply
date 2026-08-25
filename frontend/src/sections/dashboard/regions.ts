// The dashboard's plugin-region SEMANTICS (spec/dashboard/ui-surface.md § S3,
// rules.md § extensibility). The dashboard is a plugin extension surface: the
// frontend plugin system may ADD widgets/panels/stats at three nested slot
// regions and SUPPRESS built-ins by their stable published id. Ownership is
// split along the standard seam — the dashboard owns *what happens at its
// regions* (this module: how contributions merge with built-ins and how
// suppression behaves), the plugins vertical owns *how contributions arrive*
// (their shape, loading, visibility). The plugins vertical is greenfield, so
// this module is built and tested against an empty contribution set: the region
// behaviour ships with the dashboard, complete before any plugin exists
// (rules.md § extensibility — "built with the dashboard, not with the plugin
// system").
//
// Pure and framework-light: `mergeRegion` decides id order and suppression;
// rendering (the PluginRegionOutlet at each region's tail, the built-ins'
// explicit JSX) is the page's. `Component` is the only Solid type referenced
// (it is what a contribution carries), so the merge logic stays unit-testable
// as plain data.
//
// These are the three PIECE regions. The dashboard's fourth region is
// screen-level — one contribution in place of the whole body — and its
// semantics live in `bodyRegion.ts`; what stays here is the rule that ties the
// two together: suppression may not empty the body (`applicableSuppressions`).

import type { Component } from 'solid-js';
import { anchorMerge } from '../../plugins/anchorMerge';

// ── Published ids (ui-surface § S3) ──────────────────────────────────────────
// Every built-in piece has a stable published id — the public API a
// contribution anchors to or suppresses. Shape: `<widget>` / `<widget>.<panel>`
// / `<widget>.<panel>.<stat>`. Renaming one is a breaking change, so they live
// here as a single frozen source of truth (the page references these, not bare
// string literals).
export const DASHBOARD_IDS = {
  replenishment: {
    id: 'replenishment',
    inbound: {
      id: 'replenishment.inbound',
      today: 'replenishment.inbound.today',
      thisWeek: 'replenishment.inbound.this-week',
      notDelivered: 'replenishment.inbound.not-delivered',
    },
    inboundExternal: {
      id: 'replenishment.inbound-external',
      today: 'replenishment.inbound-external.today',
      thisWeek: 'replenishment.inbound-external.this-week',
      notDelivered: 'replenishment.inbound-external.not-delivered',
    },
    internalOrder: {
      id: 'replenishment.internal-order',
      draft: 'replenishment.internal-order.draft',
    },
  },
  distribution: {
    id: 'distribution',
    shipments: {
      id: 'distribution.shipments',
      notShipped: 'distribution.shipments.not-shipped',
    },
    customerRequisition: {
      id: 'distribution.customer-requisition',
      new: 'distribution.customer-requisition.new',
      emergency: 'distribution.customer-requisition.emergency',
    },
  },
  inventory: {
    id: 'inventory',
    expiringStock: {
      id: 'inventory.expiring-stock',
      expired: 'inventory.expiring-stock.expired',
      expiringSoon: 'inventory.expiring-stock.expiring-soon',
      expiringThreeMonths: 'inventory.expiring-stock.expiring-three-months',
      expiringBetween: 'inventory.expiring-stock.expiring-between',
    },
    stockLevels: {
      id: 'inventory.stock-levels',
      outOfStockRecentlyUsed:
        'inventory.stock-levels.out-of-stock-recently-used',
      outOfStock: 'inventory.stock-levels.out-of-stock',
      atRisk: 'inventory.stock-levels.at-risk',
      lowStock: 'inventory.stock-levels.low-stock',
      overstocked: 'inventory.stock-levels.overstocked',
      highStock: 'inventory.stock-levels.high-stock',
      totalItems: 'inventory.stock-levels.total-items',
    },
  },
} as const;

// ── Region model ─────────────────────────────────────────────────────────────

export type AnchorPosition = 'before' | 'after';
/**
 * A contribution's placement request: before/after a built-in's published id.
 */
export interface RegionAnchor {
  position: AnchorPosition;
  id: string;
}

/**
 * A built-in piece as `mergeRegion` sees it — just its id and whether a
 * preference gate currently hides it. A hidden built-in is NOT rendered, but
 * its id still *exists* as an anchor target (ui-surface § published ids: "a
 * preference-gated built-in that its gate hides is simply absent; its id still
 * exists"). Rendering is the page's; the merge only needs identity +
 * visibility.
 */
export interface RegionBuiltIn {
  id: string;
  hidden?: boolean;
}

/**
 * A contribution as the plugins vertical will hand it in (shape owned there;
 * only the fields the merge needs are modelled). `order` and `id` break ties
 * among contributions sharing an anchor; `Component` is carried through to the
 * outlet untouched.
 */
export interface RegionContribution {
  id: string;
  anchor?: RegionAnchor;
  order?: number;
  Component: Component;
}

export type MergedEntry =
  | { kind: 'builtin'; id: string }
  | { kind: 'plugin'; id: string; Component: Component };

/**
 * A recorded degradation — surfaced, never silent (ui-surface § region
 * semantics).
 */
export interface RegionDiagnostic {
  contributionId: string;
  message: string;
}

export interface MergedRegion {
  /** Built-ins and contributions in final, deterministic render order. */
  entries: MergedEntry[];
  diagnostics: RegionDiagnostic[];
}

/**
 * Merge plugin contributions into a region's built-ins (OMS-REG-DB-02.2–.8).
 *
 * Order (deterministic, identical across reloads, independent of plugin load
 * order — OMS-REG-DB-02.2–.5): anchor position (before/after a published id,
 * else container end) first, then contribution `order`, then contribution
 * `id`. A contribution whose anchor id does not resolve to a *rendered*
 * built-in (missing, or hidden by its gate, or itself suppressed) falls to the
 * container end and the degradation is recorded in `diagnostics` — never
 * silent.
 *
 * Suppression (OMS-REG-DB-02.6–.8): a built-in in `suppressed` is removed (the
 * page, whose built-ins nest, drops the whole subtree when it suppresses a
 * widget or panel). Suppression removes only built-ins; a plugin cannot
 * suppress another plugin's contribution, so `contributions` is never filtered
 * by `suppressed`.
 */
export const mergeRegion = (
  builtIns: readonly RegionBuiltIn[],
  contributions: readonly RegionContribution[],
  suppressed: ReadonlySet<string>
): MergedRegion => {
  // The ORDERING is the shared one (src/plugins/anchorMerge.ts) — the same
  // anchor → order → id sort the internal-order line table's columns use, so
  // authors meet one placement contract at every surface. What stays the
  // dashboard's is the vocabulary either side of it: suppression collapses into
  // "this built-in has no rendered position" on the way in, and the merged
  // entries come back out as the region's own builtin/plugin union.
  const merged = anchorMerge(
    builtIns.map(b => ({
      id: b.id,
      hidden: b.hidden === true || suppressed.has(b.id),
    })),
    contributions.map(c => ({
      id: c.id,
      order: c.order,
      anchor: c.anchor
        ? c.anchor.position === 'before'
          ? { before: c.anchor.id }
          : { after: c.anchor.id }
        : undefined,
      Component: c.Component,
    }))
  );

  return {
    entries: merged.entries.map((entry): MergedEntry =>
      entry.kind === 'host'
        ? { kind: 'builtin', id: entry.item.id }
        : { kind: 'plugin', id: entry.item.id, Component: entry.item.Component }
    ),
    diagnostics: merged.diagnostics,
  };
};

/**
 * What the widget region's suppressions come to once the never-blank rule is
 * applied: the set actually obeyed, plus the ids ignored so they can be named
 * in diagnostics.
 */
export interface AppliedSuppression {
  applied: ReadonlySet<string>;
  /** Suppressed widget ids obeying which would have emptied the body. */
  ignored: readonly string[];
}

/**
 * The suppressions the built-in dashboard body actually applies
 * (OMS-REG-DB-02.18, ui-surface § region semantics — "suppression may not empty
 * the body").
 *
 * Suppression is site-wide and store-blind (registry § `suppressedPieces`),
 * so a plugin clearing the built-ins to make room for a screen only some stores
 * should see would blank the dashboard of every OTHER store on the server. That
 * screen belongs in the body region, which replaces the body only where it
 * renders. So the degenerate case is refused rather than obeyed: if the union
 * of every plugin's suppressions would leave the widget region with nothing at
 * all to render, the widget-level suppressions are dropped and named — the
 * built-ins render, and the dashboard is never blank.
 *
 * Only WIDGET suppressions are recoverable, because only they can empty the
 * body; nested-piece suppressions are obeyed either way (a suppressed panel
 * stays suppressed inside a widget this rule brought back). Called from the
 * built-in body only — while a body contribution occupies the region there are
 * no built-ins to empty (ui-surface § body-region semantics § precedence).
 */
export const applicableSuppressions = (
  widgetBuiltIns: readonly RegionBuiltIn[],
  /** How many widget contributions are visible in this store. */
  widgetContributions: number,
  suppressed: ReadonlySet<string>
): AppliedSuppression => {
  const wouldRender =
    widgetContributions > 0 ||
    widgetBuiltIns.some(
      widget => widget.hidden !== true && !suppressed.has(widget.id)
    );
  // A built-in its own gate hides is not recoverable: ignoring its suppression
  // would not put anything on the screen.
  const recoverable = widgetBuiltIns
    .filter(widget => widget.hidden !== true && suppressed.has(widget.id))
    .map(widget => widget.id);
  if (wouldRender || recoverable.length === 0) {
    return { applied: suppressed, ignored: [] };
  }
  const applied = new Set(suppressed);
  for (const id of recoverable) applied.delete(id);
  return { applied, ignored: recoverable };
};

/**
 * Every published id, flattened — the id-stability surface (ui-surface § S3).
 */
export const publishedIds = (): string[] => {
  const ids: string[] = [];
  for (const widget of Object.values(DASHBOARD_IDS)) {
    for (const [key, value] of Object.entries(widget)) {
      if (key === 'id') {
        ids.push(value as string);
      } else if (typeof value === 'object') {
        for (const [innerKey, innerValue] of Object.entries(value)) {
          if (typeof innerValue === 'string' && innerKey !== undefined)
            ids.push(innerValue);
        }
      }
    }
  }
  return ids;
};
