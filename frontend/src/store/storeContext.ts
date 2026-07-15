import { createSignal } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import {
  StoreContext,
  type StoreContextResult,
} from '../api/storeContext.generated';

// Spec (Store Login, Guard 3): store preferences + permissions as global state.
// Callers invoke refetchStoreContext directly — on store entry, and from whatever
// observes a completed sync (kdd/explicit-composition). Failures
// are handled globally and leave the state empty; callers keep showing their
// loading state.

const [storeContext, setStoreContext] = createSignal<StoreContextResult>();

const refetch = async (storeId: string | undefined) => {
  if (!storeId) {
    setStoreContext(undefined);
    return;
  }

  const result = await graphqlFetch(StoreContext, { storeId });
  if (result.kind !== 'success') {
    setStoreContext(undefined);
    return;
  }

  setStoreContext(result.data);
};

// The id of the store the user has currently ENTERED (Guard 3 loaded). Reactive and
// module-level, so store-scoped global caches (createStoreScopedResource) can depend
// on it without a component. Derived from storeContext — which the store guard only
// populates once the store is resolved and authorised from the URL — so it is
// URL-driven in effect (kdd/url-structure), and never reports a store whose lookups
// aren't yet valid to fetch. Undefined between store switches (guard shows its loading
// state).
const currentStoreId = () => storeContext()?.storePreferences.id;

// The id of the currently authenticated user (Guard 3 loaded). Reactive and module-level
// for the same reason as currentStoreId — so global caches keyed by user (the user layer
// of table config, kdd/table-state) can depend on it without a component. `me` is the
// UserNode union member, so read is `me?.userId`; undefined between store switches.
const currentUserId = () => storeContext()?.me?.userId;

export {
  storeContext,
  refetch as refetchStoreContext,
  currentStoreId,
  currentUserId,
};
