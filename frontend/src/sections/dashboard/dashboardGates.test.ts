import { describe, expect, it } from 'vitest';
import {
  computeDashboardGates,
  computeDashboardSlots,
  itemCountsThresholds,
} from './dashboardGates';
import type { StoreContextResult } from '../../api/storeContext.generated';

// The dashboard display gates and label slots (spec/dashboard/rules.md §
// display gates / § thresholds). Criteria cited from
// spec/dashboard/acceptance.md.

type Preferences = StoreContextResult['preferences'];
type StorePreferences = StoreContextResult['storePreferences'];

// A baseline with every gate OFF / threshold unset (0), overridden per case.
const prefs = (overrides: Partial<Preferences> = {}): Preferences => ({
  syncRecordsDisplayThreshold: 0,
  genderOptions: [],
  manageVaccinesInDoses: false,
  manageVvmStatusForStock: false,
  allowTrackingOfStockByDonor: false,
  sortByVvmStatusThenExpiry: false,
  expiredStockPreventIssue: false,
  expiredStockIssueThreshold: 0,
  invoiceStatusOptions: [],
  useProcurementFunctionality: false,
  externalInboundShipmentLinesMustBeAuthorised: false,
  backdating: {
    inventoryAdjustmentsEnabled: false,
    shipmentsEnabled: false,
    maxDays: 0,
  },
  numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts: 0,
  numberOfMonthsThresholdToShowLowStockAlertsForProducts: 0,
  numberOfMonthsThresholdToShowOverStockAlertsForProducts: 0,
  firstThresholdForExpiringItems: 0,
  secondThresholdForExpiringItems: 0,
  ...overrides,
});

const store = (
  overrides: Partial<StorePreferences> = {}
): StorePreferences => ({
  id: 'store-a',
  packToOne: false,
  issueInForeignCurrency: false,
  manuallyLinkInternalOrderToInboundShipment: false,
  omProgramModule: false,
  vaccineModule: false,
  monthsOverstock: 6,
  monthsUnderstock: 3,
  monthsItemsExpire: 0,
  stocktakeFrequency: 0,
  monthlyConsumptionLookBackPeriod: 0,
  monthsLeadTime: 0,
  ...overrides,
});

describe('dashboard display gates', () => {
  // AC-R2 — the external-inbound panel exists only while procurement is on.
  it('AC-R2: external inbound panel follows the procurement capability', () => {
    expect(computeDashboardGates(prefs(), store()).externalInboundPanel).toBe(
      false
    );
    expect(
      computeDashboardGates(
        prefs({ useProcurementFunctionality: true }),
        store()
      ).externalInboundPanel
    ).toBe(true);
  });

  // AC-T3 — the emergency stat exists only while the program module is on.
  it('AC-T3: emergency stat follows the program-module store preference', () => {
    expect(computeDashboardGates(prefs(), store()).emergencyStat).toBe(false);
    expect(
      computeDashboardGates(prefs(), store({ omProgramModule: true }))
        .emergencyStat
    ).toBe(true);
  });

  // AC-S3 — out-of-stock (recently used) is shown only when the consumption
  // look-back preference is set.
  it('AC-S3: out-of-stock (recently used) follows the look-back preference', () => {
    expect(
      computeDashboardGates(prefs(), store()).outOfStockRecentlyUsedStat
    ).toBe(false);
    expect(
      computeDashboardGates(
        prefs({
          numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts: 3,
        }),
        store()
      ).outOfStockRecentlyUsedStat
    ).toBe(true);
  });

  // AC-S6 — at-risk is hidden while the low-stock-alert threshold is 0.
  it('AC-S6: at-risk stat gated by the low-stock-alert threshold', () => {
    expect(computeDashboardGates(prefs(), store()).atRiskStat).toBe(false);
    expect(
      computeDashboardGates(
        prefs({ numberOfMonthsThresholdToShowLowStockAlertsForProducts: 3 }),
        store()
      ).atRiskStat
    ).toBe(true);
  });

  // AC-S7 — overstocked is hidden while the over-stock-alert threshold is 0;
  // the hiding is load-bearing (the threshold-0 degenerate count counts every
  // consuming item and must never be displayed).
  it('AC-S7: overstocked stat gated by the over-stock-alert threshold', () => {
    expect(computeDashboardGates(prefs(), store()).overstockedStat).toBe(false);
    expect(
      computeDashboardGates(
        prefs({ numberOfMonthsThresholdToShowOverStockAlertsForProducts: 6 }),
        store()
      ).overstockedStat
    ).toBe(true);
  });

  // AC-E4 — between-thresholds is hidden only when BOTH expiry thresholds are
  // 0; one set threshold is enough to show it.
  it('AC-E4: expiring-between-thresholds gated on either expiry threshold', () => {
    expect(
      computeDashboardGates(prefs(), store()).expiringBetweenThresholdsStat
    ).toBe(false);
    expect(
      computeDashboardGates(
        prefs({ firstThresholdForExpiringItems: 100 }),
        store()
      ).expiringBetweenThresholdsStat
    ).toBe(true);
    expect(
      computeDashboardGates(
        prefs({ secondThresholdForExpiringItems: 200 }),
        store()
      ).expiringBetweenThresholdsStat
    ).toBe(true);
    expect(
      computeDashboardGates(
        prefs({
          firstThresholdForExpiringItems: 100,
          secondThresholdForExpiringItems: 200,
        }),
        store()
      ).expiringBetweenThresholdsStat
    ).toBe(true);
  });
});

describe('dashboard label slots', () => {
  // ui-surface § label slots — each {slot} is filled from its named store
  // value; the two "more than … months" stats read DIFFERENT preferences.
  it('fills each label slot from its named preference', () => {
    const slots = computeDashboardSlots(
      prefs({
        numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts: 4,
        numberOfMonthsThresholdToShowLowStockAlertsForProducts: 2,
        numberOfMonthsThresholdToShowOverStockAlertsForProducts: 9,
        firstThresholdForExpiringItems: 100,
        secondThresholdForExpiringItems: 200,
      }),
      store({ monthsUnderstock: 3, monthsOverstock: 6 })
    );
    expect(slots).toEqual({
      consumptionLookbackMonths: 4,
      lowStockAlertMonths: 2,
      overstockAlertMonths: 9,
      understockMonths: 3,
      overstockMonths: 6,
      firstExpiryDays: 100,
      secondExpiryDays: 200,
    });
    // The overstock-alert slot (gated overstocked stat) and the overstock
    // slot (ungated high-stock stat) are independent knobs.
    expect(slots.overstockAlertMonths).not.toBe(slots.overstockMonths);
  });
});

describe('itemCounts thresholds', () => {
  // AC-S8 — the low/high thresholds are always sent explicitly from the store
  // understock / overstock preferences; no fetch happens before they resolve.
  it('AC-S8: sends explicit store-preference thresholds once resolved', () => {
    expect(itemCountsThresholds('store-a', undefined)).toBeUndefined();
    const key = itemCountsThresholds(
      'store-a',
      computeDashboardSlots(
        prefs(),
        store({ monthsUnderstock: 3, monthsOverstock: 6 })
      )
    );
    expect(JSON.parse(key!)).toEqual({
      storeId: 'store-a',
      lowStockThreshold: 3,
      highStockThreshold: 6,
    });
  });
});
