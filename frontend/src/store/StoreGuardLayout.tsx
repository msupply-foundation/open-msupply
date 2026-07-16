import { createEffect, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { authUser } from '../auth/authContext';
import { getPreviousStoreId, recordPreviousStoreId } from '../appData';
import {
  currentStoreId,
  refetchStoreContext,
  storeContext,
} from './storeContext';
import { StoreSelectionScreen } from './StoreSelectionScreen';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

// Reserved path for "no store in the URL": the segment never names a store, so
// the ordinary resolution below presents the picker (or auto-enters a single
// store). URLs without a store segment redirect here, and store switching
// navigates here.
export const resolveStorePath = '/resolve-store';

export type StoreSummary = {
  id: string;
  code: string;
  name: string;
};

// Spec (Store Login, Guards 2 and 3), applied as common logic to whatever
// first URL segment we are looking at. The store to enter is the URL's store,
// or the only store the user has; otherwise there is none and we show the
// store-selection screen ([D14]: a routed page at /resolve-store, not a modal).
// Entering records the store and fetches its context; the routed section shows
// a loading state until that context is loaded for this store and user (so
// re-authenticating as a different user re-loads even for the same store).
export const StoreGuardLayout: Component<RouteSectionProps> = props => {
  const params = useParams();
  const navigate = useNavigate();
  const user = () => authUser();
  const stores = () => user()?.stores.nodes ?? [];

  const storeToEnter = () =>
    stores().find(s => s.id === params.storeId) ??
    (stores().length === 1 ? stores()[0] : undefined);

  // Loaded for THIS {store, user} (SL-5). Keyed on the id the context was
  // FETCHED with (currentStoreId), never the response's storePreferences.id —
  // a store without a preference row gets the server's default row (id ''),
  // which would never match and leave the guard refetching forever. (#188's
  // fix; re-restored after an intervening merge resolution reverted it.)
  const contextLoaded = (storeId: string) => {
    const context = storeContext();
    return (
      currentStoreId() === storeId && context?.me.userId === user()?.userId
    );
  };

  createEffect(() => {
    const store = storeToEnter();
    const currentUser = user();
    if (!store || !currentUser) return;
    recordPreviousStoreId(currentUser.userId, store.id);
    // Auto-selected store (the URL segment did not name it): navigate to
    // /{store-id}.
    if (params.storeId !== store.id)
      navigate(`/${store.id}`, { replace: true });
    if (!contextLoaded(store.id)) void refetchStoreContext(store.id);
  });

  // Pin previous and default to the top of the picker.
  const pickerStores = () => {
    const currentUser = user();
    if (!currentUser) return [];
    const pinned = [
      getPreviousStoreId(currentUser.userId),
      currentUser.defaultStore?.id,
    ];
    const top = stores().filter(s => pinned.includes(s.id));
    return [...top, ...stores().filter(s => !top.includes(s))];
  };

  return (
    <Show
      when={storeToEnter()}
      fallback={
        <StoreSelectionScreen
          stores={pickerStores()}
          defaultStoreId={user()?.defaultStore?.id}
          lastUsedStoreId={
            user() ? getPreviousStoreId(user()!.userId) : undefined
          }
          onSelect={id => navigate(`/${id}`)}
        />
      }
    >
      {store => (
        <Show
          when={contextLoaded(store().id)}
          fallback={
            <div class={styles.page}>
              <p>{t('store.loading')}</p>
            </div>
          }
        >
          {props.children}
        </Show>
      )}
    </Show>
  );
};
