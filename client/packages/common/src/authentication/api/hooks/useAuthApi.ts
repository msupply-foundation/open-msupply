import { useOmSupplyApi } from '../../../api';
import { getSdk } from '../operations.generated';

export type AuthApi = ReturnType<typeof getSdk>;

export const useAuthApi = (): AuthApi => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};
