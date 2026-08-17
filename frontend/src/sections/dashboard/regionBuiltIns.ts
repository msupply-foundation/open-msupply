import { DASHBOARD_IDS, type RegionBuiltIn } from './regions';
import type { DashboardGates } from './dashboardGates';

/*
 * The built-ins each dashboard region contains, in RENDER order, with the
 * preference gate that currently hides each one
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

/** The card grid: the three built-in widgets. */
export const widgetBuiltIns = (): readonly RegionBuiltIn[] => [
  { id: ids.replenishment.id },
  { id: ids.distribution.id },
  { id: ids.inventory.id },
];

/** The panels of one widget, in render order. */
export const panelBuiltIns = (
  widget: string,
  gates: DashboardGates | undefined
): readonly RegionBuiltIn[] => {
  switch (widget) {
    case ids.replenishment.id:
      return [
        { id: ids.replenishment.inbound.id },
        {
          id: ids.replenishment.inboundExternal.id,
          hidden: !gates?.externalInboundPanel,
        },
        { id: ids.replenishment.internalOrder.id },
      ];
    case ids.distribution.id:
      return [
        { id: ids.distribution.shipments.id },
        { id: ids.distribution.customerRequisition.id },
      ];
    case ids.inventory.id:
      return [
        { id: ids.inventory.expiringStock.id },
        { id: ids.inventory.stockLevels.id },
      ];
    default:
      // A plugin widget's panel region: its built-ins are the plugin's own,
      // which this host module knows nothing about.
      return [];
  }
};

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
