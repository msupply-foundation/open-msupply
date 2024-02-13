import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { useOutboundNumber } from './../utils/useOutboundNumber';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutbound } from './useOutbound';
import { OutboundFragment } from './../../operations.generated';

export const useOutboundFields = <KeyOfOutbound extends keyof OutboundFragment>(
  keys: KeyOfOutbound | KeyOfOutbound[]
): FieldSelectorControl<OutboundFragment, KeyOfOutbound> => {
  const outboundNumber = useOutboundNumber();
  const { data } = useOutbound();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundNumber);

  return useFieldsSelector(
    queryKey,
    () => api.get.byNumber(outboundNumber),
    (patch: Partial<OutboundFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
