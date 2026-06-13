import { useMutation } from '@tanstack/react-query';
import type { UserPermission } from '@/gql/schema';
import { useSession } from '@/app/session';
import { authSdk } from './api';

interface LoginInput {
  username: string;
  password: string;
}

/**
 * Real login flow: authToken -> me -> permissions, then populate the session.
 * The token isn't in the session yet during this sequence, so it's passed
 * explicitly as a request header for the me/permissions calls.
 */
export function useLogin() {
  const setSession = useSession(s => s.setSession);

  return useMutation({
    mutationFn: async ({ username, password }: LoginInput) => {
      const { authToken } = await authSdk.authToken({ username, password });
      if (authToken.__typename !== 'AuthToken') {
        throw new Error(authToken.error.description || 'Login failed');
      }

      const token = authToken.token;
      const headers = { Authorization: `Bearer ${token}` };

      const { me } = await authSdk.me(undefined, headers);
      const store = me.defaultStore ?? me.stores.nodes[0] ?? undefined;

      let permissions: UserPermission[] = [];
      if (store) {
        const res = await authSdk.permissions({ storeId: store.id }, headers);
        permissions = res.me.permissions.nodes.flatMap(n => n.permissions);
      }

      return { token, me, store, permissions };
    },
    onSuccess: ({ token, me, store, permissions }) => {
      setSession({
        token,
        user: { userId: me.userId, username: me.username },
        store: store
          ? { id: store.id, code: store.code, name: store.name }
          : undefined,
        stores: me.stores.nodes.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
        })),
        permissions,
      });
    },
  });
}
