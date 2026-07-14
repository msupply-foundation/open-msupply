import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureBreaches = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();

  return useQuery({
    queryKey: api.keys.paramList(queryParams),
    queryFn: api.get.list(queryParams)
  });
};
