import { graphqlFetch } from '../../api/graphql';
import {
  OutboundPreferences,
  type OutboundPreferencesResult,
} from './outboundPreferences.generated';
import { createStoreScopedResource } from '../../api/storeScopedResource';
import { currentStoreId } from '../../store/storeContext';
import { STATUS_FLOW, type OutboundStatus } from './outboundStatus';

// The vertical's preference gates (rules.md § store-preference gates) — one
// store-scoped fetch shared by list and detail. Display/affordance gates only.
export type OutboundPrefs = {
  prefs: OutboundPreferencesResult['preferences'];
  store: OutboundPreferencesResult['storePreferences'];
};

export const outboundPreferencesResource =
  createStoreScopedResource<OutboundPrefs>(currentStoreId, async storeId => {
    const result = await graphqlFetch(OutboundPreferences, { storeId });
    if (result.kind !== 'success') return undefined;
    return [
      {
        prefs: result.data.preferences,
        store: result.data.storePreferences,
      },
    ];
  });

// The single node (the resource shape is a list; this cache holds one row).
export const outboundPrefs = (): OutboundPrefs | undefined =>
  outboundPreferencesResource.noSuspense()[0];

// The statuses the _invoice status options_ preference allows, in flow order
// (rules.md § preference gates: limits the list filter, crumbs, and confirm
// options). An empty preference list means "no restriction".
export const allowedStatuses = (): readonly OutboundStatus[] => {
  const options = outboundPrefs()?.prefs.invoiceStatusOptions ?? [];
  const allowed = STATUS_FLOW.filter(status =>
    (options as readonly string[]).includes(status)
  );
  return allowed.length ? allowed : STATUS_FLOW;
};
