import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { useOutboundId } from '../utils/useOutboundId';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutbound } from './useOutbound';
import { OutboundFragment } from './../../operations.generated';

export const useOutboundFields = <KeyOfOutbound extends keyof OutboundFragment>(
  keys: KeyOfOutbound | KeyOfOutbound[]
): FieldSelectorControl<OutboundFragment, KeyOfOutbound> => {
  const outboundId = useOutboundId();
  const { data } = useOutbound();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundId);

  return useFieldsSelector(
    queryKey,
    () => api.get.byId(outboundId),
    (patch: Partial<OutboundFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
