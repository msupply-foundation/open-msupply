import { useParams, useQuery } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useInboundReturn = () => {
  const { invoiceNumber = '' } = useParams();
  const api = useReturnsApi();

  return useQuery(api.keys.inboundDetail(invoiceNumber), () =>
    api.get.inboundReturnByNumber(Number(invoiceNumber))
  );
};
