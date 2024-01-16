import { useQuery } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { ListParams } from '../../api';

export const useOutbounds = (queryParams: ListParams) => {
  const api = useOutboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
