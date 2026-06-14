import { useEffect, useMemo } from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress } from '@mui/material';
import { AppLayout } from '@/app/AppLayout';
import { useSession } from '@/app/session';
import { userStoresQueryOptions } from '@/features/auth/queries';

// Store-scoped layout. The store id in the path is the source of truth for which
// store's data the pages fetch; here we validate it against the user's stores
// and keep the session's store (the drawer label) in sync with the URL.
export const Route = createFileRoute('/_authenticated/$storeId')({
  component: StoreLayout,
});

function StoreLayout() {
  const { storeId } = Route.useParams();
  const navigate = useNavigate();
  const store = useSession(s => s.store);
  const stores = useSession(s => s.stores);
  const user = useSession(s => s.user);
  const setStore = useSession(s => s.setStore);
  const setStores = useSession(s => s.setStores);
  const setUser = useSession(s => s.setUser);

  // The auth cookie doesn't persist the store list, so on a cold load fetch it
  // to validate the URL's store and resolve its name for the drawer.
  const { data: fetched, isLoading } = useQuery({
    ...userStoresQueryOptions(),
    enabled: stores.length === 0,
  });

  useEffect(() => {
    if (!fetched) return;
    if (fetched.stores.length && stores.length === 0) setStores(fetched.stores);
    if (!user) setUser(fetched.user); // repair a partial cookie missing its user
  }, [fetched, stores.length, setStores, user, setUser]);

  const known = useMemo(
    () => (stores.length ? stores : (fetched?.stores ?? [])),
    [stores, fetched],
  );
  const match = useMemo(
    () => known.find(s => s.id === storeId),
    [known, storeId],
  );

  useEffect(() => {
    if (store?.id === storeId) return; // already the active store
    if (match) {
      setStore(match); // valid store — sync the drawer label
      return;
    }
    if (known.length > 0) {
      // storeId isn't one of the user's stores — fall back to a valid one.
      const fallback = known.find(s => s.id === store?.id) ?? known[0];
      navigate({
        to: '/$storeId',
        params: { storeId: fallback.id },
        replace: true,
      });
    }
  }, [storeId, store, match, known, setStore, navigate]);

  // Block only while we genuinely can't vouch for a store that differs from the
  // session's — avoids flashing the wrong store's data/label on a cold load.
  if (store?.id !== storeId && !match && isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
