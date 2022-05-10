import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { InboundFragment } from '../../operations.generated';
import { useInboundApi } from '../utils/useInboundApi';
import { useInbound, useInboundNumber } from './useInbound';
import { useUpdateInbound } from './useUpdateInbound';

export const useInboundFields = <KeyOfInvoice extends keyof InboundFragment>(
  keyOrKeys: KeyOfInvoice | KeyOfInvoice[]
): FieldSelectorControl<InboundFragment, KeyOfInvoice> => {
  const { data } = useInbound();
  const { mutateAsync } = useUpdateInbound();
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();
  return useFieldsSelector(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    patch => mutateAsync({ ...patch, id: data?.id ?? '' }),
    keyOrKeys
  );
};
