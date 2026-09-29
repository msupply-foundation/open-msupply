import {
  hasPermission,
  isDispensary,
  storeContext,
} from '@/store/storeContext';
import {
  computeDashboardGates,
  computeDashboardSlots,
  type DashboardGates,
  type DashboardSlots,
} from './dashboardGates';
import { panelVisibility, type PanelVisibility } from './regionBuiltIns';

// The dashboard's gates and label slots, read from the session facts the store
// guard already fetched — the GLOBAL store preferences (the same
// PreferencesNode the other verticals' gates read), the user's permissions in
// the entered store, and the store's mode — not a second per-store fetch. The
// rules themselves are the pure dashboardGates module; this file only binds
// them to the reactive guard-3 context.
//
// The gates are undefined while the context is unresolved — the page holds
// each gated piece absent until they are known (unresolved ⇒ the plainer
// surface) — and `hasPermission` answers false there, the app-wide
// safe-default-OFF. Reactive, so a post-sync refetch re-gates in place.

export const dashboardGates = (): DashboardGates | undefined => {
  const ctx = storeContext();
  if (!ctx) return undefined;
  return computeDashboardGates(ctx.preferences, ctx.storePreferences);
};

export const dashboardSlots = (): DashboardSlots | undefined => {
  const ctx = storeContext();
  if (!ctx) return undefined;
  return computeDashboardSlots(ctx.preferences, ctx.storePreferences);
};

/**
 * Whether each built-in panel renders — its read permission and its store gate
 * in one map, which the page's <Show>s, the plugin regions' built-in lists,
 * and the count resources' fetches all read.
 */
export const dashboardPanels = (): PanelVisibility =>
  panelVisibility(dashboardGates(), hasPermission, isDispensary());
