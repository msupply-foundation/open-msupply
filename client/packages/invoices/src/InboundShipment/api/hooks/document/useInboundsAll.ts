import { useMutation, SortBy } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundRowFragment } from '../../operations.generated';

export const useInboundsAll = (sortBy: SortBy<InboundRowFragment>) => {
  const api = useInboundApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({ sortBy })
    ),
  };
};
