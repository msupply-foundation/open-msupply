import { UserPermission } from '@common/types';
import { UserStoreNodeFragment } from '../operations.generated';
import { useUserPermissions } from './useUserDetails';

export const useGetUserPermissions = () => {
  const { mutateAsync: getPermissions } = useUserPermissions();

  const getUserPermissions = async (
    token?: string,
    store?: UserStoreNodeFragment
  ): Promise<UserPermission[]> => {
    const permissions = await getPermissions({
      storeId: store?.id || '',
      token,
    });
    return permissions?.nodes?.[0]?.permissions || [];
  };

  return getUserPermissions;
};
