import { FilterByWithBoolean, SortBy } from '@common/hooks';
import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { useQuery } from '@openmsupply-client/common';
import { TemperatureBreachFragment } from '../../operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<TemperatureBreachFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const useTemperatureBreaches = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), api.get.list(queryParams)),
  };
};
