import { useQuery, useQueryParams } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { OutboundRowFragment } from './../../operations.generated';

export const useOutbounds = () => {
  const queryParams = useQueryParams<OutboundRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useOutboundApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filterBy: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};
