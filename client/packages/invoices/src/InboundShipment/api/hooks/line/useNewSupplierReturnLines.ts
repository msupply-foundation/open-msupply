import { useQuery } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useNewSupplierReturnLines = (lineIds: string[]) => {
  const api = useInboundApi();

  return useQuery(api.keys.newReturns(lineIds), () =>
    api.get.newSupplierReturnLines(lineIds)
  );
};
