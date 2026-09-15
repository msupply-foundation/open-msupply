import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getAllocateProgramNumber } from '../../api';
import { getSdk } from '../../operations.generated';

export const useAllocateNumberApi = () => {
  const { storeId } = useAuthContext();
  const { client } = useGql();
  const queries = getAllocateProgramNumber(getSdk(client), storeId);

  return { ...queries, storeId };
};
