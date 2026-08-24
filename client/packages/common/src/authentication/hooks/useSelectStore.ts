import { useCallback } from 'react';
import { UserStoreNodeFragment } from '../api/operations.generated';
import { useGetUserPermissions, getMostRecentCredentials } from '../api/hooks';
import { useLocalStorage } from '../../localStorage';
import { getAuthState, setAuthState } from '../AuthContext';

/**
 * Switch the active store for the logged-in user: refetches store-scoped permissions, updates
 * the persisted auth state, and bumps this store to the front of the per-user MRU list (so the
 * login screen pre-selects it next time).
 *
 * No-op when the user isn't authenticated — guards against an unauthenticated caller racing
 * with `clearAuthState` mid-logout.
 */
export const useSelectStore = () => {
  const getUserPermissions = useGetUserPermissions();
  const [mruRaw, setMRU] = useLocalStorage('/mru/credentials');

  return useCallback(
    async (store: UserStoreNodeFragment) => {
      const state = getAuthState();
      if (!state.isAuthenticated) return;

      const username = state.user?.name ?? '';
      const mru = getMostRecentCredentials(mruRaw);
      const newMRU = [
        { username, store },
        ...mru.filter(
          m => m.username.toLowerCase() !== username.toLowerCase()
        ),
      ];
      setMRU(newMRU);

      const permissions = await getUserPermissions(store);
      setAuthState({
        ...state,
        store,
        user: state.user
          ? { ...state.user, permissions }
          : undefined,
      });
    },
    [getUserPermissions, mruRaw, setMRU]
  );
};
