import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useSession } from '@/app/session';

// Pathless auth gate. The app shell (AppLayout) lives one level down on the
// $storeId layout so the whole shell has the store in scope.
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    // Session store is the source of truth, read synchronously (race-free).
    if (!useSession.getState().isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: Outlet,
});
