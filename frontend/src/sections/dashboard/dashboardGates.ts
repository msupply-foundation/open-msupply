// The dashboard's display-gate and label-slot rules (spec/dashboard/rules.md §
// display gates + § thresholds), stated once over the raw preference values.
// Pure — type-only imports — so the gate rules are unit-testable against the AC
// criteria; the reactive reads over the guard-3 store context live in
// dashboardPreferences.ts.
//
// All are client-side display gates: the server still computes every count; a
// gated-off stat is absent entirely, never shown disabled (ui-surface §
// layout). A threshold of 0 means "not set" ⇒ its stat is hidden — for
// overstocked that hiding is load-bearing: at threshold 0 the server counts
// every item with amc > 0, and that degenerate value must never be displayed
// (OMS-REG-DB-01.52).

import type { StoreContextResult } from '@/store/storeContext.generated';
import type { ItemCountsVariables } from './dashboardCounts.generated';

type Preferences = StoreContextResult['preferences'];
type StorePreferences = StoreContextResult['storePreferences'];

export type DashboardGates = {
  /** External-inbound panel — procurement capability on (OMS-REG-DB-01.36). */
  externalInboundPanel: boolean;
  /** Emergency (new) customer-requisition stat — program module on (OMS-REG-DB-01.39). */
  emergencyStat: boolean;
  /** Out-of-stock (recently used) stat — consumption look-back set (OMS-REG-DB-01.48). */
  outOfStockRecentlyUsedStat: boolean;
  /** At-risk stat — low-stock-alert threshold > 0 (OMS-REG-DB-01.51). */
  atRiskStat: boolean;
  /** Overstocked stat — over-stock-alert threshold > 0 (OMS-REG-DB-01.52). */
  overstockedStat: boolean;
  /** Expiring-between-thresholds stat — at least one expiry threshold > 0 (OMS-REG-DB-01.45). */
  expiringBetweenThresholdsStat: boolean;
};

export type DashboardSlots = {
  /** {consumption-lookback-months} — the out-of-stock look-back (months). */
  consumptionLookbackMonths: number;
  /** {low-stock-alert-months} — the at-risk tooltip's threshold (months). */
  lowStockAlertMonths: number;
  /** {overstock-alert-months} — the gated overstocked stat's threshold (months). */
  overstockAlertMonths: number;
  /** {understock-months} — low-stock threshold, also the itemCounts low arg. */
  understockMonths: number;
  /** {overstock-months} — high-stock threshold, also the itemCounts high arg. */
  overstockMonths: number;
  /** {first-expiry-days} / {second-expiry-days} — the expiry window (whole days). */
  firstExpiryDays: number;
  secondExpiryDays: number;
};

export const computeDashboardGates = (
  prefs: Preferences,
  store: StorePreferences
): DashboardGates => ({
  externalInboundPanel: prefs.useProcurementFunctionality,
  emergencyStat: store.omProgramModule,
  outOfStockRecentlyUsedStat:
    prefs.numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts >
    0,
  atRiskStat: prefs.numberOfMonthsThresholdToShowLowStockAlertsForProducts > 0,
  overstockedStat:
    prefs.numberOfMonthsThresholdToShowOverStockAlertsForProducts > 0,
  expiringBetweenThresholdsStat:
    prefs.firstThresholdForExpiringItems > 0 ||
    prefs.secondThresholdForExpiringItems > 0,
});

export const computeDashboardSlots = (
  prefs: Preferences,
  store: StorePreferences
): DashboardSlots => ({
  consumptionLookbackMonths:
    prefs.numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts,
  lowStockAlertMonths:
    prefs.numberOfMonthsThresholdToShowLowStockAlertsForProducts,
  overstockAlertMonths:
    prefs.numberOfMonthsThresholdToShowOverStockAlertsForProducts,
  understockMonths: store.monthsUnderstock,
  overstockMonths: store.monthsOverstock,
  firstExpiryDays: prefs.firstThresholdForExpiringItems,
  secondExpiryDays: prefs.secondThresholdForExpiringItems,
});

// The itemCounts resource key: the query's threshold arguments are ALWAYS sent
// explicitly, filled from the store understock / overstock preferences
// (contract.md § stock levels — the server's own 3/6 defaults are a fallback
// the app never relies on). Undefined until the store context resolves, which
// pauses the fetch rather than sending threshold-less variables (OMS-REG-DB-01.54).
export const itemCountsThresholds = (
  storeId: string,
  slots: DashboardSlots | undefined
): string | undefined =>
  slots === undefined
    ? undefined
    : JSON.stringify({
        storeId,
        lowStockThreshold: slots.understockMonths,
        highStockThreshold: slots.overstockMonths,
      } satisfies ItemCountsVariables);
