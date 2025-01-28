import { useQuery } from '@openmsupply-client/common';
import { InboundListParams } from '../../api';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useInbounds = (queryParams: InboundListParams) => {
  const api = useReturnsApi();

  return {
    ...useQuery(api.keys.inboundParamList(queryParams), () =>
      api.get.listInbound(queryParams)
    ),
  };
};
