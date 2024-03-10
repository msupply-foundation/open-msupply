import { useParams, useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useInboundReturn = () => {
  const { invoiceNumber = '' } = useParams();
  const api = useReturnsApi();

  return useQuery(api.keys.detail(invoiceNumber), () =>
    api.get.inboundReturnByNumber(Number(invoiceNumber))
  );
};
