import { ClientError } from 'graphql-request';
import { useSession } from '@/app/session';

/**
 * The server returns auth failures as a GraphQL error (HTTP 200, not 401), e.g.
 * `Unauthenticated` with `extensions.details = NotAuthenticated("Expired signature")`.
 * Detect that shape so an expired/invalid token can bounce the user to login
 * instead of surfacing as a generic error page.
 */
export function isAuthError(error: unknown): boolean {
  const errors = error instanceof ClientError ? error.response?.errors : null;
  if (!errors) return false;
  return errors.some(e => {
    if (e.message === 'Unauthenticated') return true;
    const details = e.extensions?.details;
    return typeof details === 'string' && details.includes('NotAuthenticated');
  });
}

let redirecting = false;

/**
 * Clear the dead session and send the user to /login. Safe to call from outside
 * React (gql layer) and concurrently — guarded against loops and re-entry. The
 * router is imported lazily to avoid a static gqlClient↔router import cycle.
 */
export function redirectToLogin(): void {
  if (redirecting) return;
  if (window.location.pathname === '/login') return;
  redirecting = true;
  // Remember where the user was so login can send them back.
  const from = window.location.pathname + window.location.search;
  useSession.getState().clear();
  void import('@/app/router')
    .then(({ router }) =>
      router.navigate({ to: '/login', search: { redirect: from }, replace: true }),
    )
    .finally(() => {
      redirecting = false;
    });
}
