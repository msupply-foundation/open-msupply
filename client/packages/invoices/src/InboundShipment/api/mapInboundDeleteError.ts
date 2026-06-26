import { noOtherVariants } from '@common/utils';
import { LocaleKey, TypedTFunction } from '@common/intl';
import { DeleteInboundShipmentsMutation } from './operations.generated';
import { InboundShipmentLineError } from '../context';

export type DeleteResponseNode = NonNullable<
  DeleteInboundShipmentsMutation['batchInboundShipment']['deleteInboundShipments']
>[number];

export const mapInboundDeleteError = (
  node: DeleteResponseNode,
  t: TypedTFunction<LocaleKey>,
  setError?: (id: string, error: InboundShipmentLineError) => void
): string | undefined => {
  if (node.response.__typename === 'DeleteResponse') return;
  const { error } = node.response;

  switch (error.__typename) {
    case 'CannotDeleteTransferInvoice':
      return t('messages.cant-delete-transfer-shipment');
    case 'CannotDeleteInvoiceWithReservedStock':
      setError?.(error.lineId, {
        __typename: 'BatchIsReserved',
        description: error.description,
      });
      return t('messages.cant-delete-issued-stock');
    case 'CannotDeleteInvoiceWithLines':
    case 'CannotEditInvoice':
    case 'RecordNotFound':
      return t('messages.cant-delete-generic');
    default:
      return noOtherVariants(error);
  }
};
