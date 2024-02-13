import { useQuerySelector } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundNumber } from './../utils/useOutboundNumber';
import { OutboundFragment } from './../../operations.generated';

export const useOutboundSelector = <ReturnType>(
  select: (data: OutboundFragment) => ReturnType
) => {
  const outboundNumber = useOutboundNumber();
  const api = useOutboundApi();
  return useQuerySelector(
    api.keys.detail(outboundNumber),
    () => api.get.byNumber(outboundNumber),
    select
  );
};
