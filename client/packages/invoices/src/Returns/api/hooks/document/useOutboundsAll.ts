import { SortBy, useMutation } from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { OutboundReturnRowFragment } from '../../operations.generated';

export const useOutboundsAll = (sortBy: SortBy<OutboundReturnRowFragment>) => {
  const api = useReturnsApi();
  const result = useMutation(api.keys.outboundSortedList(sortBy), () =>
    api.get.listAllOutbound(sortBy)
  );
  return {
    ...result,
    fetchAsync: result.mutateAsync,
  };
};
