import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { AppRoute } from 'packages/config/src';

export const useOutboundReturn = () => {
  const isOutboundReturnPage = useMatch(
    RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.OutboundReturn)
      .addWildCard()
      .build()
  );

  const { invoiceNumber } = useParams();
  const api = useReturnsApi();

  return useQuery(
    api.keys.outboundDetail(invoiceNumber ?? ''),
    () => api.get.outboundReturnByNumber(Number(invoiceNumber)),
    {
      enabled: !!isOutboundReturnPage,
    }
  );
};
