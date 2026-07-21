import { storeContext } from '../../store/storeContext';
import type { StoreContextResult } from '../../api/storeContext.generated';
import { STATUS_FLOW, type OutboundStatus } from './outboundStatus';

// The vertical's preference gates (rules.md § store-preference gates) — read
// from the GLOBAL store preferences already fetched by the store guard (the
// same PreferencesNode the reference vertical's stocktakePreferences reads),
// not a second per-store fetch. Display/affordance gates only; none change
// server validation. Reactive (storeContext is the guard-3 signal), so a
// post-sync refetch re-gates the affected surfaces in place.
export type OutboundPrefs = {
  prefs: StoreContextResult['preferences'];
  store: StoreContextResult['storePreferences'];
};

export const outboundPrefs = (): OutboundPrefs | undefined => {
  const ctx = storeContext();
  if (!ctx) return undefined;
  return { prefs: ctx.preferences, store: ctx.storePreferences };
};

// The statuses the _invoice status options_ preference allows, in flow order
// (rules.md § preference gates: limits the list filter, crumbs, and confirm
// options). An empty preference list means "no restriction".
export const allowedStatuses = (): readonly OutboundStatus[] => {
  const options = outboundPrefs()?.prefs?.invoiceStatusOptions ?? [];
  const allowed = STATUS_FLOW.filter(status =>
    (options as readonly string[]).includes(status)
  );
  return allowed.length ? allowed : STATUS_FLOW;
};
