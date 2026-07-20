import { createSignal } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import {
  StoreContext,
  type StoreContextResult,
} from '../api/storeContext.generated';

// Spec (Store Login, Guard 3): store preferences + permissions as global state.
// Callers invoke refetchStoreContext directly — on store entry, and from
// whatever observes a completed sync (kdd/explicit-composition). Failures are
// handled globally and leave the state empty; callers keep showing their
// loading state.

const [storeContext, setStoreContext] = createSignal<StoreContextResult>();

// The store the loaded context belongs to — keyed on the REQUEST, not derived
// from the response: storePreferences.id is the store id only when the store
// has a preference row; for a store without one the server answers with a
// default row whose id is "" (find_one_by_id_or_default), so a
// response-derived check would never confirm and the store guard would refetch
// forever.
const [loadedStoreId, setLoadedStoreId] = createSignal<string>();

const refetch = async (storeId: string | undefined) => {
  if (!storeId) {
    setStoreContext(undefined);
    setLoadedStoreId(undefined);
    return;
  }

  const result = await graphqlFetch(StoreContext, { storeId });
  if (result.kind !== 'success') {
    setStoreContext(undefined);
    setLoadedStoreId(undefined);
    return;
  }

  setStoreContext(result.data);
  setLoadedStoreId(storeId);
};

// The id of the store the user has currently ENTERED (Guard 3 loaded).
// Reactive and module-level, so store-scoped global caches
// (createStoreScopedResource) can depend on it without a component. Set only
// when the store guard has resolved and authorised the store from the URL and
// its context fetch succeeded — so it is URL-driven in effect
// (kdd/url-structure), and never reports a store whose lookups aren't yet
// valid to fetch. Keyed on the REQUEST (not the response's
// storePreferences.id, which is "" for a store without a preference row).
// Undefined between store switches (guard shows its loading state).
const currentStoreId = () => loadedStoreId();

// The id of the currently authenticated user (Guard 3 loaded). Reactive and
// module-level for the same reason as currentStoreId — so global caches keyed
// by user (the user layer of table config, kdd/table-state) can depend on it
// without a component. `me` is the UserNode union member, so read is
// `me?.userId`; undefined between store switches.
const currentUserId = () => storeContext()?.me?.userId;

// The stocktake display-gate preferences (spec/stocktakes › store-preference
// gates), read from the guard-3 PreferencesNode. Each defaults to `false` while
// the context is still unresolved — the safe default is OFF, so a gated column /
// field never flashes in before the preference is known (mirrors the D7 rule for
// the simplified layout: unresolved ⇒ render the plainer surface). Reactive, so
// a post-sync refetch re-gates the affected surfaces in place.
const stocktakePreferences = () => {
  const prefs = storeContext()?.preferences;
  return {
    manageVaccinesInDoses: prefs?.manageVaccinesInDoses ?? false,
    manageVvmStatusForStock: prefs?.manageVvmStatusForStock ?? false,
    allowTrackingOfStockByDonor: prefs?.allowTrackingOfStockByDonor ?? false,
  };
};

export {
  storeContext,
  refetch as refetchStoreContext,
  currentStoreId,
  currentUserId,
  stocktakePreferences,
};
