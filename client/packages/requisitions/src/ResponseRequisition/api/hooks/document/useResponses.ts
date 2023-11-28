import { useQuery } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';
import { ListParams } from '../../api';

export const useResponses = (queryParams: ListParams) => {
  const api = useResponseApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
