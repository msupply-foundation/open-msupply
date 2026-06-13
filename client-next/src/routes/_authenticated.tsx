import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/app/AppLayout';
import { useSession } from '@/app/session';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    // Session store is the source of truth, read synchronously (race-free).
    if (!useSession.getState().isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
