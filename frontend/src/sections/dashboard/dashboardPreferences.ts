import { storeContext } from '@/store/storeContext';
import {
  computeDashboardGates,
  computeDashboardSlots,
  type DashboardGates,
  type DashboardSlots,
} from './dashboardGates';

// The dashboard's display gates and label slots, read from the GLOBAL store
// preferences the store guard already fetched (the same PreferencesNode the
// other verticals' gates read) — not a second per-store fetch. The rules
// themselves are the pure dashboardGates module; this file only binds them to
// the reactive guard-3 context.
//
// Undefined while the context is unresolved — the page holds each gated piece
// absent until the gates are known (unresolved ⇒ the plainer surface).
// Reactive, so a post-sync refetch re-gates in place.

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
