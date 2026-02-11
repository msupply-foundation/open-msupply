import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { InboundFragment } from '../../operations.generated';
import { useInboundApi } from '../utils/useInboundApi';
import { useInbound, useInboundId } from './useInbound';
import { useInboundShipment } from './useInboundShipment';

export const useInboundFields = <KeyOfInvoice extends keyof InboundFragment>(
  keyOrKeys: KeyOfInvoice | KeyOfInvoice[]
): FieldSelectorControl<InboundFragment, KeyOfInvoice> => {
  const { data } = useInbound();
  const {
    update: { update },
  } = useInboundShipment();
  const invoiceId = useInboundId();
  const api = useInboundApi();
  return useFieldsSelector(
    api.keys.detail(invoiceId),
    () => api.get.byId(invoiceId),
    patch => update({ ...patch, id: data?.id ?? '' }),
    keyOrKeys
  );
};
