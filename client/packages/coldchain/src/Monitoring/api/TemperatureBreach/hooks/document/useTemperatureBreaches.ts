import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureBreaches = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();

  return useQuery(api.keys.paramList(queryParams), api.get.list(queryParams));
};
