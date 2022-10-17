import { useMutation, SortBy } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundRowFragment } from '../../operations.generated';

export const useInboundsAll = (sortBy: SortBy<InboundRowFragment>) => {
  const api = useInboundApi();
  const result = useMutation(api.keys.sortedList(sortBy), () =>
    api.get.listAll({ sortBy })
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};
