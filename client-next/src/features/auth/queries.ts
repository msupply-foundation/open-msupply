import { queryOptions } from '@tanstack/react-query';
import type { SessionStore, SessionUser } from '@/app/session';
import { authSdk } from './api';

export interface UserStores {
  user: SessionUser;
  stores: SessionStore[];
  defaultStoreId?: string;
}

// The logged-in user's identity and accessible stores (the auth cookie persists
// neither the store list nor — if it's partial — the user). Used to validate
// and repair a store-scoped session on a cold load.
export function userStoresQueryOptions() {
  return queryOptions({
    queryKey: ['userStores'],
    queryFn: async (): Promise<UserStores> => {
      const { me } = await authSdk.me();
      return {
        user: { userId: me.userId, username: me.username },
        stores: me.stores.nodes.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
        })),
        defaultStoreId: me.defaultStore?.id,
      };
    },
    staleTime: 5 * 60_000,
  });
}
