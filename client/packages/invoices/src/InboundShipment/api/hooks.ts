import { useOmSupplyApi } from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

export const useInboundShipmentApi = () => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};
