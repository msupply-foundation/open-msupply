import { useMutation, SortBy } from '@openmsupply-client/common';
import { useResponseApi } from '../utils/useResponseApi';
import { ResponseRowFragment } from '../../operations.generated';

export const useResponsesAll = (sortBy: SortBy<ResponseRowFragment>) => {
  const api = useResponseApi();

  return {
    ...useMutation({
      mutationFn: () => api.get.listAll({ sortBy }),
    }),
  };
};
