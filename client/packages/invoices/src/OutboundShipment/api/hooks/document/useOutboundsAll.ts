import { SortBy, useMutation } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { OutboundRowFragment } from './../../operations.generated';

export const useOutboundsAll = (sortBy: SortBy<OutboundRowFragment>) => {
  const api = useOutboundApi();
  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({
        sortBy,
      })
    ),
  };
};
