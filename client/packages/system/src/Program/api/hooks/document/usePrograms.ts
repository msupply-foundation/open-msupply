import { FilterBy, useQuery } from '@openmsupply-client/common';
import { useProgramApi } from '../utils/useProgramApi';

export const usePrograms = (filterBy?: FilterBy) => {
  const api = useProgramApi();
  const params = {
    filterBy,
  };

  return {
    ...useQuery(api.keys.paramList(params), () => api.get.list(params)),
  };
};
