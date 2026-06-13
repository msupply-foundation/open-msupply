import { useEffect } from 'react';
import { getToken } from '@/app/session';
import { refreshSession, tokenExpiresAt } from '@/app/tokenRefresh';
import { redirectToLogin } from '@/lib/authError';

const CHECK_INTERVAL_MS = 60_000; // re-check every minute
const REFRESH_BUFFER_MS = 5 * 60_000; // refresh once within 5 min of expiry

/**
 * Proactively refresh the bearer token before it expires so an active session is
 * never logged out mid-use. Reactive recovery (gqlClient + RouteError) still
 * covers the case where the tab was suspended past expiry.
 */
export function useTokenRefresh() {
  useEffect(() => {
    const check = async () => {
      const token = getToken();
      if (!token) return;
      const expiresAt = tokenExpiresAt(token);
      if (expiresAt === null) return; // unknown lifetime — leave it to reactive recovery
      if (expiresAt - Date.now() > REFRESH_BUFFER_MS) return;
      const ok = await refreshSession();
      if (!ok) redirectToLogin();
    };
    void check(); // catch a near-expired token on mount
    const id = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
}
