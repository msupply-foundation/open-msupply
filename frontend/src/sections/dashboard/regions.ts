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

import type { Component } from 'solid-js';

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
/** A contribution's placement request: before/after a built-in's published id. */
export interface RegionAnchor {
  position: AnchorPosition;
  id: string;
}

/**
 * A built-in piece as `mergeRegion` sees it — just its id and whether a
 * preference gate currently hides it. A hidden built-in is NOT rendered, but its
 * id still *exists* as an anchor target (ui-surface § published ids: "a
 * preference-gated built-in that its gate hides is simply absent; its id still
 * exists"). Rendering is the page's; the merge only needs identity + visibility.
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

/** A recorded degradation — surfaced, never silent (ui-surface § region semantics). */
export interface RegionDiagnostic {
  contributionId: string;
  message: string;
}

export interface MergedRegion {
  /** Built-ins and contributions in final, deterministic render order. */
  entries: MergedEntry[];
  diagnostics: RegionDiagnostic[];
}

// The base position a contribution resolves to, as a fractional index into the
// rendered built-ins: `before X` sits just before X's index, `after X` just
// after, the container end past the last. Fractions keep contributions between
// the right built-ins when the whole list is sorted.
const END = Number.POSITIVE_INFINITY;

/**
 * Merge plugin contributions into a region's built-ins (AC-D4, AC-D5).
 *
 * Order (deterministic, identical across reloads, independent of plugin load
 * order — AC-D4): anchor position (before/after a published id, else container
 * end) first, then contribution `order`, then contribution `id`. A contribution
 * whose anchor id does not resolve to a *rendered* built-in (missing, or hidden
 * by its gate, or itself suppressed) falls to the container end and the
 * degradation is recorded in `diagnostics` — never silent.
 *
 * Suppression (AC-D5): a built-in in `suppressed` is removed (the page, whose
 * built-ins nest, drops the whole subtree when it suppresses a widget or panel).
 * Suppression removes only built-ins; a plugin cannot suppress another plugin's
 * contribution, so `contributions` is never filtered by `suppressed`.
 */
export const mergeRegion = (
  builtIns: readonly RegionBuiltIn[],
  contributions: readonly RegionContribution[],
  suppressed: ReadonlySet<string>
): MergedRegion => {
  const diagnostics: RegionDiagnostic[] = [];

  // Rendered built-ins: not suppressed, not gate-hidden. Their index is the
  // anchor coordinate space; a hidden/suppressed id therefore has no position.
  const rendered = builtIns.filter(b => !suppressed.has(b.id) && !b.hidden);
  const positionOf = new Map(rendered.map((b, index) => [b.id, index]));

  const basePosition = (c: RegionContribution): number => {
    if (!c.anchor) return END;
    const target = positionOf.get(c.anchor.id);
    if (target === undefined) {
      // Anchor id absent, gate-hidden, or suppressed — fall through to the end.
      diagnostics.push({
        contributionId: c.id,
        message: `anchor "${c.anchor.id}" not found in region — placed at container end`,
      });
      return END;
    }
    // before → just ahead of the target; after → just behind it.
    return c.anchor.position === 'before' ? target - 0.5 : target + 0.5;
  };

  // Sortable rows: built-ins keep their integer index and sort ahead of any
  // contribution sharing that coordinate (tier 0 < 1); contributions sort by
  // base position, then order (unset last), then id — a total, load-order-
  // independent ordering (ids are unique within a region).
  type Row = {
    primary: number;
    tier: 0 | 1;
    order: number;
    id: string;
    entry: MergedEntry;
  };
  const rows: Row[] = [];

  rendered.forEach((b, index) => {
    rows.push({
      primary: index,
      tier: 0,
      order: 0,
      id: b.id,
      entry: { kind: 'builtin', id: b.id },
    });
  });

  for (const c of contributions) {
    rows.push({
      primary: basePosition(c),
      tier: 1,
      order: c.order ?? END,
      id: c.id,
      entry: { kind: 'plugin', id: c.id, Component: c.Component },
    });
  }

  rows.sort(
    (a, b) =>
      a.primary - b.primary ||
      a.tier - b.tier ||
      a.order - b.order ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );

  return { entries: rows.map(r => r.entry), diagnostics };
};

/** Every published id, flattened — the id-stability surface (ui-surface § S3). */
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
