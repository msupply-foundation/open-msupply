import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { AppRoute } from 'packages/config/src';

export const useInboundReturn = () => {
  const isInboundReturnPage = useMatch(
    RouteBuilder.create(AppRoute.Distribution)
      .addPart(AppRoute.InboundReturn)
      .addWildCard()
      .build()
  );

  const { invoiceNumber = '' } = useParams();
  const api = useReturnsApi();

  return useQuery(
    api.keys.inboundDetail(invoiceNumber),
    () => api.get.inboundReturnByNumber(Number(invoiceNumber)),
    {
      enabled: !!isInboundReturnPage,
    }
  );
};
