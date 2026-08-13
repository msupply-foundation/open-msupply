import { createEffect, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import { authUser, loginableStores } from '../auth/authContext';
import { getAlwaysOpenStoreId, recordPreviousStoreId } from '../appData';
import {
  currentStoreId,
  refetchStoreContext,
  storeContext,
} from './storeContext';
import { resolveStoreToEnter } from './resolveStoreToEnter';
import { createStorePicker } from './storePicker';
import { StoreSelectionScreen } from './StoreSelectionScreen';
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
// first URL segment we are looking at. The store to enter is resolved by
// resolveStoreToEnter above; otherwise there is none and we show the
// store-selection screen ([D14]: the panel's ROUTED host, at /resolve-store —
// its other host is the bottom bar's StoreSwitchModal).
// Entering records the store and fetches its context; the routed section shows
// a loading state until that context is loaded for this store and user (so
// re-authenticating as a different user re-loads even for the same store).
export const StoreGuardLayout: Component<RouteSectionProps> = props => {
  const params = useParams();
  const navigate = useNavigate();
  const user = () => authUser();
  // Spec (SL-8): disabled stores are not offered, so they are absent from the
  // list every guard below reads — the picker, the URL match, and the
  // single-store auto-entry count alike.
  const stores = () => loginableStores(user());

  // "Entered this session" gates the always-open auto-entry (SL-9): the
  // context signal holds a store once one is entered and is cleared on logout,
  // so a fresh sign-in auto-enters the saved store while an explicit switch
  // (SL-6 — a store is already entered) always reaches the picker.
  const storeToEnter = () =>
    resolveStoreToEnter(
      stores(),
      params.storeId,
      user() ? getAlwaysOpenStoreId(user()!.userId) : undefined,
      currentStoreId() !== undefined
    );

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

  // The panel's ordering + confirm wiring is shared with the store-switch
  // modal (storePicker.ts — spec S3's two hosts, [D14]).
  const picker = createStorePicker();

  return (
    <Show
      when={storeToEnter()}
      fallback={
        <StoreSelectionScreen
          stores={picker.stores()}
          defaultStoreId={picker.defaultStoreId()}
          lastUsedStoreId={picker.lastUsedStoreId()}
          pinnedCount={picker.pinnedCount()}
          defaultAlwaysOpen={picker.alwaysOpenSaved()}
          onSelect={picker.confirm}
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
