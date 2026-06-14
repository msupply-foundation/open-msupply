import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSession } from '@/app/session';
import { queryClient } from '@/lib/queryClient';
import { userStoresQueryOptions } from '@/features/auth/queries';

// `/` carries no store, so resolve one and forward to its dashboard. This route
// is also the loop-breaker: it must never send an authenticated session back to
// /login without first clearing the token, or it ping-pongs against the login
// guard (which redirects here whenever a token is present).
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: async () => {
    const session = useSession.getState();

    let storeId = session.store?.id;

    // Authenticated but no store in the session (e.g. a partial/stale cookie that
    // kept its token but lost its store). Recover it from the user's stores
    // rather than bouncing to /login — that bounce is the redirect loop.
    if (!storeId && session.isAuthenticated) {
      try {
        const { user, stores, defaultStoreId } =
          await queryClient.ensureQueryData(userStoresQueryOptions());
        if (!session.user) session.setUser(user); // repair a partial cookie
        const resolved =
          stores.find(s => s.id === defaultStoreId) ?? stores[0];
        if (resolved) {
          session.setStores(stores);
          session.setStore(resolved); // also repairs the cookie's store
          storeId = resolved.id;
        }
      } catch {
        // me() failed — the token is dead/expired. Fall through to a clean logout.
      }
    }

    if (storeId) {
      throw redirect({ to: '/$storeId', params: { storeId } });
    }

    // No usable store. If a (dead) token is still around, clear it so the login
    // screen doesn't immediately redirect back here — that is the flicker loop.
    if (session.isAuthenticated) session.clear();
    throw redirect({ to: '/login' });
  },
});
