import { GraphQLClient } from 'graphql-request';
import { Environment } from '@/lib/config';
import { getSdk } from '@/features/auth/auth.generated';
import { useSession } from '@/app/session';
import { queryClient } from '@/lib/queryClient';
import { redirectToLogin } from '@/lib/authError';

// Dedicated client for refresh: no bearer header (the refresh rides the server's
// httpOnly refresh-token cookie, sent automatically same-origin) and no
// responseMiddleware, so a failed refresh can't recurse back into this handler.
const refreshSdk = getSdk(
  new GraphQLClient(Environment.GRAPHQL_URL, { credentials: 'include' }),
);

let inFlight: Promise<boolean> | null = null;

/**
 * Single-flight token refresh. Concurrent callers share one network round-trip.
 * Resolves true if the session now holds a fresh bearer token.
 */
export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { refreshToken } = await refreshSdk.refreshToken();
      if (refreshToken.__typename === 'RefreshToken' && refreshToken.token) {
        useSession.getState().setToken(refreshToken.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  })();
  void inFlight.finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Decode a JWT's `exp` claim (seconds) into epoch ms; null if not decodable. */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Reactive recovery after a request failed auth: try to silently refresh. On
 * success, re-run loaders + active queries so they retry with the new token
 * (a sanctioned global auth event — like post-sync — not a per-mutation nuke).
 * On failure the session is truly dead, so fall back to the login redirect.
 */
export async function handleAuthError(): Promise<void> {
  const ok = await refreshSession();
  if (!ok) {
    redirectToLogin();
    return;
  }
  void queryClient.invalidateQueries({ refetchType: 'active' });
  const { router } = await import('@/app/router');
  void router.invalidate();
}
