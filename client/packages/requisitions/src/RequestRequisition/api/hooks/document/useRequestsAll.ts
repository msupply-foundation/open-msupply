import { useMutation, SortBy } from '@openmsupply-client/common';
import { RequestRowFragment } from '../../operations.generated';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestsAll = (sortBy: SortBy<RequestRowFragment>) => {
  const api = useRequestApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({ sortBy })
    ),
  };
};
