import { useQuery, useQueryParamsStore } from '@openmsupply-client/common';
import { useProgramApi } from '../utils/useProgramApi';

export const usePrograms = () => {
  const api = useProgramApi();
  const {
    sort: { sortBy },
  } = useQueryParamsStore();
  return {
    ...useQuery(api.keys.paramList({ sortBy }), () => api.get.list({ sortBy })),
  };
};
