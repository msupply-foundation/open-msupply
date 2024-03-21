import { useQuery } from '@openmsupply-client/common';
import { OutboundListParams } from '../../api';
import { useReturnsApi } from '../utils/useReturnsApi';

export const useOutbounds = (queryParams: OutboundListParams) => {
  const api = useReturnsApi();

  return {
    ...useQuery(api.keys.outboundParamList(queryParams), () =>
      api.get.listOutbound(queryParams)
    ),
  };
};
