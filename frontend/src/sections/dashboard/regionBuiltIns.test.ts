import { describe, expect, it } from 'vitest';
import type { UserPermission } from '@/store/storeContext';
import type { DashboardGates } from './dashboardGates';
import { publishedIds, DASHBOARD_IDS } from './regions';
import {
  panelBuiltIns,
  panelVisibility,
  statBuiltIns,
  widgetBuiltIns,
  widgetShowsPanel,
  type PanelVisibility,
} from './regionBuiltIns';

// The region built-ins restate the page's structure so `mergeRegion` can
// resolve an anchor (sibling ids, in render order, with the gate that hides
// each). These tests are the drift guard: every published id must appear in
// exactly one region, so a built-in added to the page without a home here
// fails. They also pin `panelVisibility`, the single statement of which panels
// render — preference gates AND read permissions together.

const allGatesOn: DashboardGates = {
  externalInboundPanel: true,
  emergencyStat: true,
  outOfStockRecentlyUsedStat: true,
  atRiskStat: true,
  overstockedStat: true,
  expiringBetweenThresholdsStat: true,
};

// The permission predicate, as the page passes `hasPermission`: everything
// granted, or everything but the named ones.
const holdingAll =
  (...withheld: UserPermission[]) =>
  (permission: UserPermission) =>
    !withheld.includes(permission);
const holdingNone = () => false;

const allPanelsShown: PanelVisibility = panelVisibility(
  allGatesOn,
  holdingAll(),
  /* dispensary */ true
);

const containers = [
  ...widgetBuiltIns(allPanelsShown).map(w => w.id),
  ...widgetBuiltIns(allPanelsShown).flatMap(w =>
    panelBuiltIns(w.id, allPanelsShown).map(p => p.id)
  ),
];

const everyRegionId = (gates: DashboardGates | undefined): string[] => [
  ...widgetBuiltIns(allPanelsShown).map(w => w.id),
  ...widgetBuiltIns(allPanelsShown).flatMap(w =>
    panelBuiltIns(w.id, allPanelsShown).map(p => p.id)
  ),
  ...containers.flatMap(id => statBuiltIns(id, gates).map(s => s.id)),
];

describe('the region built-ins', () => {
  it('covers every published id exactly once', () => {
    const ids = everyRegionId(allGatesOn);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(publishedIds().sort());
  });

  it('lists the four widgets in card-grid order', () => {
    expect(widgetBuiltIns(allPanelsShown).map(w => w.id)).toEqual([
      'replenishment',
      'distribution',
      'inventory',
      'prescriptions',
    ]);
  });

  it('lists a widget`s panels in render order', () => {
    expect(
      panelBuiltIns(DASHBOARD_IDS.replenishment.id, allPanelsShown).map(
        p => p.id
      )
    ).toEqual([
      'replenishment.inbound',
      'replenishment.inbound-external',
      'replenishment.internal-order',
    ]);
    expect(
      panelBuiltIns(DASHBOARD_IDS.prescriptions.id, allPanelsShown).map(
        p => p.id
      )
    ).toEqual(['prescriptions.requests']);
  });

  it('keeps a gated-off piece present but hidden — its id stays an anchor target', () => {
    const panels = panelBuiltIns(
      DASHBOARD_IDS.replenishment.id,
      panelVisibility(
        { ...allGatesOn, externalInboundPanel: false },
        holdingAll(),
        true
      )
    );
    expect(panels.map(p => p.id)).toContain('replenishment.inbound-external');
    expect(
      panels.find(p => p.id === 'replenishment.inbound-external')?.hidden
    ).toBe(true);
  });

  it('keeps a piece the user cannot READ present but hidden, likewise', () => {
    // The anchor target must survive the permission gate too: a contribution
    // anchored to a panel this user can't see still has a place to sort into.
    const panels = panelBuiltIns(
      DASHBOARD_IDS.inventory.id,
      panelVisibility(allGatesOn, holdingAll('STOCK_LINE_QUERY'), true)
    );
    expect(panels.map(p => p.id)).toEqual([
      'inventory.expiring-stock',
      'inventory.stock-levels',
    ]);
    expect(panels.every(p => p.hidden)).toBe(true);
  });

  it('hides every gated piece while the store context is unresolved', () => {
    // gates undefined = context not loaded; the page holds each gated piece
    // back.
    const stats = statBuiltIns(
      DASHBOARD_IDS.inventory.stockLevels.id,
      undefined
    );
    expect(stats.filter(s => !s.hidden).map(s => s.id)).toEqual([
      'inventory.stock-levels.out-of-stock',
      'inventory.stock-levels.total-items',
    ]);
  });

  it('has no built-ins for a plugin-contributed container', () => {
    expect(panelBuiltIns('cold_chain.sensors', allPanelsShown)).toEqual([]);
    expect(statBuiltIns('cold_chain.sensors.breaches', allGatesOn)).toEqual([]);
  });
});

describe('panel visibility', () => {
  // Each panel names the permission its counts need (OMS-REG-DB-01.60), and
  // the two that carry a store gate as well need both.
  it('maps each panel to the permission the server checks', () => {
    const panels = (...withheld: UserPermission[]) =>
      panelVisibility(allGatesOn, holdingAll(...withheld), true);
    const hidden = (withheld: UserPermission) =>
      Object.entries(panels(withheld))
        .filter(([, shown]) => !shown)
        .map(([id]) => id);

    expect(hidden('INBOUND_SHIPMENT_QUERY')).toEqual(['replenishment.inbound']);
    expect(hidden('INBOUND_SHIPMENT_EXTERNAL_QUERY')).toEqual([
      'replenishment.inbound-external',
    ]);
    expect(hidden('OUTBOUND_SHIPMENT_QUERY')).toEqual([
      'distribution.shipments',
    ]);
    // The wire trap: the resource is RequisitionStats, the permission checked
    // is RequisitionQuery — and it carries both requisition panels.
    expect(hidden('REQUISITION_QUERY')).toEqual([
      'replenishment.internal-order',
      'distribution.customer-requisition',
    ]);
    // One permission, both stock panels.
    expect(hidden('STOCK_LINE_QUERY')).toEqual([
      'inventory.expiring-stock',
      'inventory.stock-levels',
    ]);
    expect(hidden('PRESCRIPTION_REQUEST_QUERY')).toEqual([
      'prescriptions.requests',
    ]);
  });

  it('needs both the procurement preference and the external read', () => {
    const externalShown = (
      gates: DashboardGates | undefined,
      can: (permission: UserPermission) => boolean
    ) =>
      panelVisibility(gates, can, true)[
        DASHBOARD_IDS.replenishment.inboundExternal.id
      ];
    expect(externalShown(allGatesOn, holdingAll())).toBe(true);
    expect(
      externalShown(
        { ...allGatesOn, externalInboundPanel: false },
        holdingAll()
      )
    ).toBe(false);
    expect(
      externalShown(allGatesOn, holdingAll('INBOUND_SHIPMENT_EXTERNAL_QUERY'))
    ).toBe(false);
    // Unresolved context: the plainer surface.
    expect(externalShown(undefined, holdingAll())).toBe(false);
  });

  it('shows the prescriptions panel only with the permission AND a dispensary', () => {
    const shown = (
      can: (permission: UserPermission) => boolean,
      dispensary: boolean
    ) =>
      panelVisibility(allGatesOn, can, dispensary)[
        DASHBOARD_IDS.prescriptions.requests.id
      ];
    expect(shown(holdingAll(), true)).toBe(true);
    expect(shown(holdingAll(), false)).toBe(false);
    expect(shown(holdingAll('PRESCRIPTION_REQUEST_QUERY'), true)).toBe(false);
  });

  it('hides a widget once every one of its panels is hidden', () => {
    // One permission carries both inventory panels, so losing it takes the
    // whole widget (OMS-REG-DB-01.61) — while the distribution widget, whose
    // panels answer to two different permissions, survives losing one.
    const noStock = panelVisibility(
      allGatesOn,
      holdingAll('STOCK_LINE_QUERY'),
      true
    );
    expect(widgetShowsPanel(DASHBOARD_IDS.inventory.id, noStock)).toBe(false);
    expect(
      widgetBuiltIns(noStock).find(w => w.id === DASHBOARD_IDS.inventory.id)
        ?.hidden
    ).toBe(true);

    const noOutbound = panelVisibility(
      allGatesOn,
      holdingAll('OUTBOUND_SHIPMENT_QUERY'),
      true
    );
    expect(widgetShowsPanel(DASHBOARD_IDS.distribution.id, noOutbound)).toBe(
      true
    );
  });

  it('hides every widget when the user holds no count permission at all', () => {
    const none = panelVisibility(allGatesOn, holdingNone, true);
    expect(Object.values(none).some(Boolean)).toBe(false);
    expect(widgetBuiltIns(none).every(w => w.hidden)).toBe(true);
  });
});
