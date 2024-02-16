import { SortBy, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { InboundReturnRowFragment } from '../../operations.generated';

export const useInboundsAll = (sortBy: SortBy<InboundReturnRowFragment>) => {
  const api = useReturnsApi();
  const result = useMutation(api.keys.inboundSortedList(sortBy), () =>
    api.get.listAllInbound(sortBy)
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};
