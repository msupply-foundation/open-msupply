import { useQuerySelector } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundId } from '../utils/useOutboundId';
import { OutboundFragment } from './../../operations.generated';

export const useOutboundSelector = <ReturnType>(
  select: (data: OutboundFragment) => ReturnType
) => {
  const outboundId = useOutboundId();
  const api = useOutboundApi();
  return useQuerySelector(
    api.keys.detail(outboundId),
    () => api.get.byId(outboundId),
    select
  );
};
