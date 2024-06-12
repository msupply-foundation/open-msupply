import { useQuery } from 'packages/common/src';
import { useItemApi } from 'packages/system/src/Item';

type UseItemVaccineParams = {
  pagination: { first: number; offset: number };
  filter: { [key: string]: { like: string } };
};

export const useVaccineItems = ({
  filter,
  pagination,
}: UseItemVaccineParams) => {
  const queryParams = {
    filterBy: filter ?? null,
    ...pagination,
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
  };

  const api = useItemApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.itemVaccine(queryParams)
  );
};
