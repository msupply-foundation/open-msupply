import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getAllocateNumber } from '../../api';
import { getSdk } from '../../operations.generated';

export const useAllocateNumberApi = () => {
  const { storeId } = useAuthContext();
  const { client } = useGql();
  const queries = getAllocateNumber(getSdk(client), storeId);

  return { ...queries, storeId };
};
