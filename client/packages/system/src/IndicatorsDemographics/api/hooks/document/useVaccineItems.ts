import { useQuery } from 'packages/common/src';
import { useItemApi } from 'packages/system/src/Item';

export const useVaccineItems = () => {
  const queryParams = {
    sortBy: { key: 'name', isDesc: false, direction: 'asc' as 'asc' | 'desc' },
    offset: 0,
    first: 1000, // TODO: remove arbitrary limit
  };

  const api = useItemApi();
  return useQuery(api.keys.paramList(queryParams), () =>
    api.get.vaccineItems(queryParams)
  );
};
