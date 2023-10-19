import { useUrlQueryParams } from '@common/hooks';
import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useQuery } from '@openmsupply-client/common';

export const useTemperatureBreaches = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'startDatetime', dir: 'desc' },
  });

  const api = useTemperatureBreachApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), api.get.list(queryParams)),
  };
};
