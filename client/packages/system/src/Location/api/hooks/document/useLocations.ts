import { useQuery } from '@openmsupply-client/common';
import { useLocationApi } from '../utils/useLocationApi';
import { ListParams } from '../../api';

export const useLocations = (queryParams: ListParams) => {
  const api = useLocationApi();

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.list(queryParams)
  );
};
