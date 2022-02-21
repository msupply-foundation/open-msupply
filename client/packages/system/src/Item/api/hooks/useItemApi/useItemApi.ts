import { useOmSupplyApi } from '@openmsupply-client/common';
import { getSdk } from '../../operations.generated';

export type ItemApi = ReturnType<typeof getSdk>;

export const useItemApi = (): ItemApi => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};
