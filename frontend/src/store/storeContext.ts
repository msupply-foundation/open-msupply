import { createSignal } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import { StoreContext, type StoreContextResult } from '../api/storeContext.generated';

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

export { storeContext, refetch as refetchStoreContext };
