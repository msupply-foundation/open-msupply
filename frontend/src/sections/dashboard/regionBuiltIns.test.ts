import { describe, expect, it } from 'vitest';
import type { DashboardGates } from './dashboardGates';
import { publishedIds, DASHBOARD_IDS } from './regions';
import { panelBuiltIns, statBuiltIns, widgetBuiltIns } from './regionBuiltIns';

// The region built-ins restate the page's structure so `mergeRegion` can
// resolve an anchor (sibling ids, in render order, with the gate that hides
// each). These tests are the drift guard: every published id must appear in
// exactly one region, so a built-in added to the page without a home here
// fails.

const allGatesOn: DashboardGates = {
  externalInboundPanel: true,
  emergencyStat: true,
  outOfStockRecentlyUsedStat: true,
  atRiskStat: true,
  overstockedStat: true,
  expiringBetweenThresholdsStat: true,
};

const containers = [
  ...widgetBuiltIns().map(w => w.id),
  ...widgetBuiltIns().flatMap(w =>
    panelBuiltIns(w.id, allGatesOn).map(p => p.id)
  ),
];

const everyRegionId = (gates: DashboardGates | undefined): string[] => [
  ...widgetBuiltIns().map(w => w.id),
  ...widgetBuiltIns().flatMap(w => panelBuiltIns(w.id, gates).map(p => p.id)),
  ...containers.flatMap(id => statBuiltIns(id, gates).map(s => s.id)),
];

describe('the region built-ins', () => {
  it('covers every published id exactly once', () => {
    const ids = everyRegionId(allGatesOn);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(publishedIds().sort());
  });

  it('lists the three widgets in card-grid order', () => {
    expect(widgetBuiltIns().map(w => w.id)).toEqual([
      'replenishment',
      'distribution',
      'inventory',
    ]);
  });

  it('lists a widget`s panels in render order', () => {
    expect(
      panelBuiltIns(DASHBOARD_IDS.replenishment.id, allGatesOn).map(p => p.id)
    ).toEqual([
      'replenishment.inbound',
      'replenishment.inbound-external',
      'replenishment.internal-order',
    ]);
  });

  it('keeps a gated-off piece present but hidden — its id stays an anchor target', () => {
    const panels = panelBuiltIns(DASHBOARD_IDS.replenishment.id, {
      ...allGatesOn,
      externalInboundPanel: false,
    });
    expect(panels.map(p => p.id)).toContain('replenishment.inbound-external');
    expect(
      panels.find(p => p.id === 'replenishment.inbound-external')?.hidden
    ).toBe(true);
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
    expect(panelBuiltIns('cold_chain.sensors', allGatesOn)).toEqual([]);
    expect(statBuiltIns('cold_chain.sensors.breaches', allGatesOn)).toEqual([]);
  });
});
