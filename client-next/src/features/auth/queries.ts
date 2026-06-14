import { queryOptions } from '@tanstack/react-query';
import type { SessionStore } from '@/app/session';
import { authSdk } from './api';

export interface UserStores {
  stores: SessionStore[];
  defaultStoreId?: string;
}

// The stores the logged-in user can access (the auth cookie doesn't persist
// these). Used to validate/resolve a store-scoped URL on a cold load.
export function userStoresQueryOptions() {
  return queryOptions({
    queryKey: ['userStores'],
    queryFn: async (): Promise<UserStores> => {
      const { me } = await authSdk.me();
      return {
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
