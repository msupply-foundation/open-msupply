import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getAllocateNumberMutations } from '../../api';
import { getSdk } from '../../operations.generated';

export const useAllocateNumberApi = () => {
  const { storeId } = useAuthContext();
  const { client } = useGql();
  const queries = getAllocateNumberMutations(getSdk(client), storeId);

  return { ...queries, storeId };
};
