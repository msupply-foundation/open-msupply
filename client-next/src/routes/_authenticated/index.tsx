import { createFileRoute, redirect } from '@tanstack/react-router';
import { useSession } from '@/app/session';

// `/` carries no store, so send the user to their current store's dashboard.
export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    const storeId = useSession.getState().store?.id;
    if (!storeId) throw redirect({ to: '/login' });
    throw redirect({ to: '/$storeId', params: { storeId } });
  },
});
