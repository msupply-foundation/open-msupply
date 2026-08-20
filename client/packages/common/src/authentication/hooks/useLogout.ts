import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '@openmsupply-client/config';
import { RouteBuilder } from '../../utils/navigation';
import { useLocalStorage } from '../../localStorage';
import { useAuthApi } from '../api/hooks';
import { fetchOidcConfig, oidcLogoutUrl } from '../api/oidcConfig';
import { clearAuthState, getAuthState } from '../AuthContext';

/**
 * Logs the user out:
 *   1. Calls the server `logout` query — revokes the session and clears the HttpOnly cookie.
 *      Errors are swallowed (already-expired session / network problem shouldn't block local
 *      cleanup; the goal is "ensure no live session").
 *   2. Clears the locally cached auth state and any auth-error indicator.
 *   3. Navigates to /login — unless the app was redirected elsewhere while step 1 was in
 *      flight (see below).
 *
 * Where the deployment has asked for single sign-on to end the identity provider's session too, an
 * earlier branch takes over: the local state is cleared and the browser handed to the server, which
 * revokes the session and redirects onward. The `logout` query is deliberately NOT called first in
 * that case — it clears the session cookie, and the server needs that cookie to know whose session
 * to end and whether the provider is involved at all.
 *
 * That branch is taken **only when a session is believed to exist**, and the guard is load-bearing
 * rather than an optimisation. This hook runs on every mount of the login page (that is how the
 * app's Logout buttons work — they navigate here and let the page log out), so without it a cold
 * load with no session would hand off to the server, be sent straight back to the login page, mount
 * again, and hand off again: an endless round trip. With it, only a logout that actually ends
 * something reaches the provider.
 */
export const useLogout = () => {
  const api = useAuthApi();
  const navigate = useNavigate();
  const [, , removeAuthError] = useLocalStorage('/error/auth');

  return useCallback(async () => {
    const pathBeforeLogout = window.location.pathname;

    const providerLogout = getAuthState().isAuthenticated
      ? oidcLogoutUrl(await fetchOidcConfig())
      : undefined;
    if (providerLogout) {
      // Local cleanup only — everything else dies with the document navigation, so a user who
      // abandons the provider's confirmation page is still logged out here.
      clearAuthState();
      removeAuthError();
      window.location.assign(providerLogout);
      return;
    }

    await api.get.logout();
    clearAuthState();
    removeAuthError();

    // A redirect during the await means some other guard has already decided where the user
    // belongs, so navigating to /login here would fight it. That fight was a real loop: the
    // login route redirected to /initialise on an uninitialised server, this navigate pulled
    // it straight back, and the two ping-ponged forever. If the new location does turn out to
    // need auth, its own guard will route to /login anyway.
    if (window.location.pathname !== pathBeforeLogout) return;

    navigate(RouteBuilder.create(AppRoute.Login).build());
  }, [api, navigate, removeAuthError]);
};
