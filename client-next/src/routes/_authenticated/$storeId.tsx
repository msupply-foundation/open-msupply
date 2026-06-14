import { useEffect } from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { AppLayout } from '@/app/AppLayout';
import { useSession } from '@/app/session';

// Store-scoped layout. The store id in the path is the source of truth for which
// store's data the pages fetch; here we keep the session's store (the drawer
// label) in sync with it.
export const Route = createFileRoute('/_authenticated/$storeId')({
  component: StoreLayout,
});

function StoreLayout() {
  const { storeId } = Route.useParams();
  const navigate = useNavigate();
  const store = useSession(s => s.store);
  const stores = useSession(s => s.stores);
  const setStore = useSession(s => s.setStore);

  useEffect(() => {
    if (store?.id === storeId) return;
    const match = stores.find(s => s.id === storeId);
    if (match) {
      setStore(match); // legit switch — update the drawer label
      return;
    }
    // Unknown store id. Only redirect when we actually have the store list to
    // judge against (post-login); never persist an unverified/blank store.
    if (stores.length > 0 && store) {
      navigate({ to: '/$storeId', params: { storeId: store.id }, replace: true });
    }
  }, [storeId, store, stores, setStore, navigate]);

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
