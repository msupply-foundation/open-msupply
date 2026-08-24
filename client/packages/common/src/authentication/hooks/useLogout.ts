import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppRoute } from '@openmsupply-client/config';
import { RouteBuilder } from '../../utils/navigation';
import { useLocalStorage } from '../../localStorage';
import { useAuthApi } from '../api/hooks';
import { clearAuthState } from '../AuthContext';

/**
 * Logs the user out:
 *   1. Calls the server `logout` query — revokes the session and clears the HttpOnly cookie.
 *      Errors are swallowed (already-expired session / network problem shouldn't block local
 *      cleanup; the goal is "ensure no live session").
 *   2. Clears the locally cached auth state and any auth-error indicator.
 *   3. Navigates to /login — unless the app was redirected elsewhere while step 1 was in
 *      flight (see below).
 */
export const useLogout = () => {
  const api = useAuthApi();
  const navigate = useNavigate();
  const [, , removeAuthError] = useLocalStorage('/error/auth');

  return useCallback(async () => {
    const pathBeforeLogout = window.location.pathname;

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
