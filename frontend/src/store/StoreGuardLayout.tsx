import { createEffect, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { authUser } from '../auth/authContext';
import {
  getPreviousStoreId,
  recordPreviousStoreId,
  getRememberedStoreId,
  setRememberedStoreId,
} from '../appData';
import {
  currentStoreId,
  refetchStoreContext,
  storeContext,
  forceStorePicker,
  setForceStorePicker,
} from './storeContext';
import { StoreSelectionDialog } from './StoreSelectionDialog';
import { setHomeCurrency, t } from '../intl';
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
// first URL segment we are looking at. The store to enter is a remembered store,
// the only store the user has, or — except right after a fresh login (SL-6,
// forceStorePicker) — the URL's store; otherwise there is none and we show the
// store-selection modal ([D14]: one blocking in-place modal for both the login
// pick and the bottom-bar switch, wired here and in ShellLayout).
// Entering records the store and fetches its context; the routed section shows
// a loading state until that context is loaded for this store and user (so
// re-authenticating as a different user re-loads even for the same store).
export const StoreGuardLayout: Component<RouteSectionProps> = props => {
  const params = useParams();
  const navigate = useNavigate();
  const user = () => authUser();
  const stores = () => user()?.stores.nodes ?? [];

  // "Remember my choice" (SL-6): a stored store auto-enters on login, so the
  // picker isn't shown. Only used when the URL names no store; ignored if the
  // remembered store is no longer in the user's list.
  const rememberedStore = () => {
    const currentUser = user();
    if (!currentUser) return undefined;
    const id = getRememberedStoreId(currentUser.userId);
    return id ? stores().find(s => s.id === id) : undefined;
  };

  const storeToEnter = () => {
    // A remembered store, or a single-store user, always enters directly.
    const remembered = rememberedStore();
    if (remembered) return remembered;
    if (stores().length === 1) return stores()[0];
    // A fresh login (SL-6) shows the picker even if the URL names a store;
    // otherwise (refresh / in-session navigation) the URL is authoritative.
    if (forceStorePicker()) return undefined;
    return stores().find(s => s.id === params.storeId);
  };

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
    // The entered store owns the home currency (a store property, not a
    // language one — see intl/currency). Set it here so CurrencyField, the
    // financial columns, and the side-panel charges all read the right
    // symbol/decimals; re-runs on every store switch.
    setHomeCurrency(store.homeCurrencyCode);
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
        <StoreSelectionDialog
          open
          onClose={() => {}}
          stores={pickerStores()}
          defaultStoreId={user()?.defaultStore?.id}
          lastUsedStoreId={
            user() ? getPreviousStoreId(user()!.userId) : undefined
          }
          defaultRemember={!!(user() && getRememberedStoreId(user()!.userId))}
          onSelect={(id, remember) => {
            const currentUser = user();
            if (currentUser)
              setRememberedStoreId(
                currentUser.userId,
                remember ? id : undefined
              );
            // The pick satisfies the fresh-login gate; from here the URL rules.
            setForceStorePicker(false);
            navigate(`/${id}`);
          }}
        />
      }
    >
      {store => (
        <Show
          when={contextLoaded(store().id)}
          fallback={
            <div class={styles.page}>
              <p>{t('loading')}</p>
            </div>
          }
        >
          {props.children}
        </Show>
      )}
    </Show>
  );
};
