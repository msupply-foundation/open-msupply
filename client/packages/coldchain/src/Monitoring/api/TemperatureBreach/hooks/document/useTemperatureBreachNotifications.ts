import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

// Fetches temperature breaches, without raising a permission denied error if one is returned by the API
export const useTemperatureBreachNotifications = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get
      .list(queryParams)()
      .catch(_ => {})
  );
};
