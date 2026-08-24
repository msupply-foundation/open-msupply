import { UserPermission } from '@common/types';
import { UserStoreNodeFragment } from '../operations.generated';
import { useUserPermissions } from './useUserDetails';

/**
 * Fetches permissions for the given store, identifying the user via the HttpOnly session cookie.
 * Returns an empty list when the request fails or the user has no entries for the store.
 */
export const useGetUserPermissions = () => {
  const { mutateAsync: getPermissions } = useUserPermissions();

  const getUserPermissions = async (
    store?: UserStoreNodeFragment
  ): Promise<UserPermission[]> => {
    const permissions = await getPermissions({
      storeId: store?.id || '',
    });
    return permissions?.nodes?.[0]?.permissions || [];
  };

  return getUserPermissions;
};
