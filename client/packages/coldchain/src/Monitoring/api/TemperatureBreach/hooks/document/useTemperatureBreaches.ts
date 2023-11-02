import { SortBy } from '@common/hooks';
import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import {
  TemperatureBreachFilterInput,
  useQuery,
} from '@openmsupply-client/common';
import { TemperatureBreachFragment } from '../../operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureBreachFragment>;
  filterBy: TemperatureBreachFilterInput | null;
};

export const useTemperatureBreaches = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), api.get.list(queryParams)),
  };
};
