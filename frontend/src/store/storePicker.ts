import { useNavigate } from '@solidjs/router';
import { authUser, loginableStores } from '../auth/authContext';
import {
  clearAlwaysOpenStoreId,
  getAlwaysOpenStoreId,
  getPreviousStoreId,
  recordAlwaysOpenStoreId,
} from '../appData';

// The store-selection panel's wiring, shared by its two hosts ([D14]): the
// routed /resolve-store screen (StoreGuardLayout's fallback) and the
// store-switch modal (StoreSwitchModal). One place orders the list and
// confirms a pick, so the two surfaces can never disagree.
//
// Ordering (issue #193 mock): the previously logged-in store and the user's
// default store are pinned to the top; the pinned count lets the panel divide
// that group from the rest. The Remember-my-choice checkbox arrives showing
// the device's saved opt-in (spec SL-9): confirming with it ticked saves the
// confirmed store as the user's always-open store, unticked clears any saved
// one; either way confirming navigates to /{store-id} — which re-runs Guards
// 2 and 3 (SL-6).
export const createStorePicker = () => {
  const navigate = useNavigate();
  const user = () => authUser();
  // Spec (SL-8): disabled stores are never offered.
  const stores = () => loginableStores(user());

  const pinned = () => {
    const currentUser = user();
    if (!currentUser) return [];
    const top = [
      getPreviousStoreId(currentUser.userId),
      currentUser.defaultStore?.id,
    ];
    return stores().filter(s => top.includes(s.id));
  };

  return {
    stores: () => {
      const top = pinned();
      return [...top, ...stores().filter(s => !top.includes(s))];
    },
    pinnedCount: () => pinned().length,
    defaultStoreId: () => user()?.defaultStore?.id,
    lastUsedStoreId: () => {
      const currentUser = user();
      return currentUser ? getPreviousStoreId(currentUser.userId) : undefined;
    },
    // The checkbox's starting state — true while a saved store exists, even a
    // stale one (a forced re-pick keeps the opt-in).
    alwaysOpenSaved: () => {
      const currentUser = user();
      return currentUser
        ? getAlwaysOpenStoreId(currentUser.userId) !== undefined
        : false;
    },
    confirm: (storeId: string, alwaysOpen: boolean) => {
      const currentUser = user();
      if (currentUser) {
        if (alwaysOpen) recordAlwaysOpenStoreId(currentUser.userId, storeId);
        else clearAlwaysOpenStoreId(currentUser.userId);
      }
      navigate(`/${storeId}`);
    },
  };
};
