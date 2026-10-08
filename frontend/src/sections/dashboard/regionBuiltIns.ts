import {
  DASHBOARD_IDS,
  type DashboardPanelId,
  type RegionBuiltIn,
} from './regions';
import type { UserPermission } from '@/store/storeContext';
import type { DashboardGates } from './dashboardGates';

/*
 * The built-ins each dashboard region contains, in RENDER order, with the gate
 * that currently hides each one — a preference, a read permission, or (for a
 * widget) every one of its panels being hidden
 * (spec/dashboard/ui-surface.md § S3).
 *
 * `mergeRegion` needs exactly this to resolve a contribution's anchor: the
 * sibling ids in the order the page renders them, and which of them are hidden
 * (a hidden built-in is not rendered, but its id still exists — anchoring to it
 * falls to the region end with a diagnostic, not silently to position zero).
 *
 * It is a second statement of the page's structure, so it is guarded two ways:
 * every published id must appear in exactly one region here
 * (regionBuiltIns.test), and the ids themselves come from `DASHBOARD_IDS`,
 * never from literals.
 */

const ids = DASHBOARD_IDS;

/** Whether each built-in panel renders, by published id. */
export type PanelVisibility = Readonly<Record<DashboardPanelId, boolean>>;

/**
 * The ONE statement of whether a built-in panel renders: the permission its
 * counts need, AND its store gate where it has one (rules.md § permission
 * gates, § display gates). The page's <Show>, the region built-ins' `hidden`
 * flags, and each count resource's fetch all read this, so they cannot drift.
 *
 * Each panel names its own permission here rather than through a parallel
 * vocabulary of count families — the panel is what a user sees, and the
 * permission is one of the two conditions deciding whether they see it. Two
 * permissions serve two panels each, which is a fact about the server's
 * resources and reads fine stated twice.
 *
 * `can` is the permission predicate (the reactive `hasPermission`) and
 * `dispensary` the store's mode; both are passed in, so this stays pure and
 * unit-testable. Exhaustive over `DashboardPanelId` — a panel added to the
 * registry does not compile until its rule is stated here.
 */
export const panelVisibility = (
  gates: DashboardGates | undefined,
  can: (permission: UserPermission) => boolean,
  dispensary: boolean
): PanelVisibility => ({
  [ids.replenishment.inbound.id]: can('INBOUND_SHIPMENT_QUERY'),
  // The external read AND the procurement preference (OMS-REG-DB-01.36):
  // `gates` undefined is the unresolved context, which shows the plainer
  // surface.
  [ids.replenishment.inboundExternal.id]:
    can('INBOUND_SHIPMENT_EXTERNAL_QUERY') &&
    gates?.externalInboundPanel === true,
  // Both requisition panels ride RequisitionQuery — the contract's wire trap:
  // the server's resource is named RequisitionStats, the permission it checks
  // is RequisitionQuery.
  [ids.replenishment.internalOrder.id]: can('REQUISITION_QUERY'),
  [ids.distribution.shipments.id]: can('OUTBOUND_SHIPMENT_QUERY'),
  [ids.distribution.customerRequisition.id]: can('REQUISITION_QUERY'),
  // One permission, two panels: `stockCounts` and `itemCounts` authorise
  // against the same StockCount resource.
  [ids.inventory.expiringStock.id]: can('STOCK_LINE_QUERY'),
  [ids.inventory.stockLevels.id]: can('STOCK_LINE_QUERY'),
  // The permission alone would offer a widget whose links lead into a section
  // a non-dispensary store does not have.
  [ids.prescriptions.requests.id]:
    can('PRESCRIPTION_REQUEST_QUERY') && dispensary,
});

/** The panels of one widget, in render order. */
export const panelBuiltIns = (
  widget: string,
  panels: PanelVisibility
): readonly RegionBuiltIn[] => {
  const panel = (id: DashboardPanelId): RegionBuiltIn => ({
    id,
    hidden: !panels[id],
  });
  switch (widget) {
    case ids.replenishment.id:
      return [
        panel(ids.replenishment.inbound.id),
        panel(ids.replenishment.inboundExternal.id),
        panel(ids.replenishment.internalOrder.id),
      ];
    case ids.distribution.id:
      return [
        panel(ids.distribution.shipments.id),
        panel(ids.distribution.customerRequisition.id),
      ];
    case ids.inventory.id:
      return [
        panel(ids.inventory.expiringStock.id),
        panel(ids.inventory.stockLevels.id),
      ];
    case ids.prescriptions.id:
      return [panel(ids.prescriptions.requests.id)];
    default:
      // A plugin widget's panel region: its built-ins are the plugin's own,
      // which this host module knows nothing about.
      return [];
  }
};

/**
 * A widget renders while at least one of its panels does
 * (OMS-REG-DB-01.61) — `hidden` here means hidden by the piece's OWN gates,
 * never by suppression: `applicableSuppressions` reads these flags to decide
 * suppression, so deriving them from suppression would make that circular.
 */
export const widgetShowsPanel = (
  widget: string,
  panels: PanelVisibility
): boolean =>
  panelBuiltIns(widget, panels).some(panel => panel.hidden !== true);

/** The card grid: the four built-in widgets. */
export const widgetBuiltIns = (
  panels: PanelVisibility
): readonly RegionBuiltIn[] =>
  [
    ids.replenishment.id,
    ids.distribution.id,
    ids.inventory.id,
    ids.prescriptions.id,
  ].map(id => ({ id, hidden: !widgetShowsPanel(id, panels) }));

/** The statistics of one panel, in render order. */
export const statBuiltIns = (
  panel: string,
  gates: DashboardGates | undefined
): readonly RegionBuiltIn[] => {
  switch (panel) {
    case ids.replenishment.inbound.id:
      return [
        { id: ids.replenishment.inbound.today },
        { id: ids.replenishment.inbound.thisWeek },
        { id: ids.replenishment.inbound.notDelivered },
      ];
    case ids.replenishment.inboundExternal.id:
      return [
        { id: ids.replenishment.inboundExternal.today },
        { id: ids.replenishment.inboundExternal.thisWeek },
        { id: ids.replenishment.inboundExternal.notDelivered },
      ];
    case ids.replenishment.internalOrder.id:
      return [{ id: ids.replenishment.internalOrder.draft }];
    case ids.distribution.shipments.id:
      return [{ id: ids.distribution.shipments.notShipped }];
    case ids.distribution.customerRequisition.id:
      return [
        { id: ids.distribution.customerRequisition.new },
        {
          id: ids.distribution.customerRequisition.emergency,
          hidden: !gates?.emergencyStat,
        },
      ];
    case ids.prescriptions.requests.id:
      // Neither stat carries a gate of its own: both ride the panel's, which
      // is the permission plus the dispensary store.
      return [
        { id: ids.prescriptions.requests.readyToDispense },
        { id: ids.prescriptions.requests.dispensedThisWeek },
      ];
    case ids.inventory.expiringStock.id:
      return [
        { id: ids.inventory.expiringStock.expired },
        { id: ids.inventory.expiringStock.expiringSoon },
        { id: ids.inventory.expiringStock.expiringThreeMonths },
        {
          id: ids.inventory.expiringStock.expiringBetween,
          hidden: !gates?.expiringBetweenThresholdsStat,
        },
      ];
    case ids.inventory.stockLevels.id:
      return [
        {
          id: ids.inventory.stockLevels.outOfStockRecentlyUsed,
          hidden: !gates?.outOfStockRecentlyUsedStat,
        },
        { id: ids.inventory.stockLevels.outOfStock },
        { id: ids.inventory.stockLevels.atRisk, hidden: !gates?.atRiskStat },
        // Ungated, but their labels interpolate threshold slots, so the page
        // holds them back until the store context resolves — `gates` undefined
        // is exactly that state.
        { id: ids.inventory.stockLevels.lowStock, hidden: !gates },
        {
          id: ids.inventory.stockLevels.overstocked,
          hidden: !gates?.overstockedStat,
        },
        { id: ids.inventory.stockLevels.highStock, hidden: !gates },
        { id: ids.inventory.stockLevels.totalItems },
      ];
    default:
      return [];
  }
};
