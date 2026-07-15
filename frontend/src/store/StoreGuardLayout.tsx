import { createEffect, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useLocation, useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { authUser } from '../auth/authContext';
import { getPreviousStoreId, recordPreviousStoreId } from '../appData';
import {
  currentStoreId,
  refetchStoreContext,
  storeContext,
} from './storeContext';
import { StoreSelectionModal } from './StoreSelectionModal';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

// Reserved path for "no store in the URL": the segment never names a store, so the
// ordinary resolution below presents the picker (or auto-enters a single store).
// URLs without a store segment redirect here, and store switching navigates here.
export const resolveStorePath = '/resolve-store';

export type StoreSummary = {
  id: string;
  code: string;
  name: string;
};

// Spec (Store Login, Guards 2 and 3), applied as common logic to whatever first URL
// segment we are looking at. The store to enter is the URL's store, or the only
// store the user has; otherwise there is none and we show the picker in place (no
// redirect). Entering records the store and fetches its context; the routed section
// shows a loading state until that context is loaded for this store and user (so
// re-authenticating as a different user re-loads even for the same store).
export const StoreGuardLayout: Component<RouteSectionProps> = props => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = () => authUser();
  const stores = () => user()?.stores.nodes ?? [];

  // A store-less deep link keeps its destination: /inventory/stocktakes arrives
  // here with 'inventory' as the store segment, so the WHOLE current path is the
  // route to continue to once the store is known (old-app URLs carry no store
  // segment — this is what keeps them working). The reserved resolve-store path
  // carries no destination.
  const intendedPath = () =>
    params.storeId === resolveStorePath.slice(1)
      ? ''
      : `${location.pathname}${location.search}`;

  const storeToEnter = () =>
    stores().find(s => s.id === params.storeId) ??
    (stores().length === 1 ? stores()[0] : undefined);

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
    // /{store-id}, continuing to the deep link's destination when there is one.
    if (params.storeId !== store.id)
      navigate(`/${store.id}${intendedPath()}`, { replace: true });
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
        <StoreSelectionModal
          stores={pickerStores()}
          onSelect={id => navigate(`/${id}${intendedPath()}`)}
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
