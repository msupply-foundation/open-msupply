import { AuthState, getAuthState, setAuthState } from '../../AuthContext';
import { useGetUserPermissions } from './useGetUserPermissions';
import { useGetUserDetails } from './useUserDetails';
import { getStore, getMostRecentCredentials } from './useLogin';
import { useLocalStorage } from '../../../localStorage';

/**
 * Refreshes the persisted auth state (`/auth/state`) from the server's current user details and
 * permissions — e.g. after a sync delivers updated user data. The server identifies the user via
 * the HttpOnly session cookie, so nothing is passed in. ("Cookie" in the name is historical: the
 * client-side state now lives in localStorage, the session itself in the HttpOnly cookie.)
 */
export const useRefreshUserCookie = () => {
  const getUserPermissions = useGetUserPermissions();
  const { mutateAsync: getUserDetails } = useGetUserDetails();
  const [mruRaw] = useLocalStorage('/mru/credentials');

  const refreshUserCookie = async () => {
    const state = getAuthState();
    const permissions = await getUserPermissions(state.store);
    const userDetails = await getUserDetails();
    const store = await getStore(userDetails, getMostRecentCredentials(mruRaw));

    const next: AuthState = {
      ...state,
      isAuthenticated: true,
      store,
      user: {
        id: userDetails?.userId ?? '',
        name: state.user?.name ?? '',
        permissions,
        email: userDetails?.email,
        jobTitle: userDetails?.jobTitle,
      },
    };
    setAuthState(next);
  };

  return { refreshUserCookie };
};
