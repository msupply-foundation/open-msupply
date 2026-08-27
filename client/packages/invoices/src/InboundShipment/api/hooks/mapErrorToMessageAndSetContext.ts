import { noOtherVariants } from '@common/utils';
import { DeleteInboundShipmentLinesMutation } from '../operations.generated';
import { DraftInboundLine } from 'packages/invoices/src/types';
import { LocaleKey, TypedTFunction } from '@common/intl';
import { InboundShipmentLineError } from '../../context';

type DeleteResponseNode = NonNullable<
  DeleteInboundShipmentLinesMutation['batchInboundShipment']['deleteInboundShipmentLines']
>[number];

/** Returns error message as a string if line was unable to be deleted */
export const mapErrorToMessageAndSetContext = (
  line: DeleteResponseNode,
  rowsToDelete: DraftInboundLine[],
  t: TypedTFunction<LocaleKey>,
  setLinkedInvoiceErrorContext?: (
    id: string,
    error: InboundShipmentLineError
  ) => void
): string | undefined => {
  if (line.response.__typename === 'DeleteResponse') return;
  const { error } = line.response;

  switch (error.__typename) {
    case 'BatchIsReserved':
      const row = rowsToDelete.find(it => it.id === line.id);
      return t('label.inbound-shipment-cant-delete-reserved-line', {
        batch: row?.batch ?? '',
        itemCode: row?.item.code ?? '?',
      });

    case 'LineLinkedToTransferredInvoice':
      setLinkedInvoiceErrorContext?.(line.id, error);
      return t('messages.cant-delete-transferred');

    case 'CannotEditInvoice':
    case 'ForeignKeyError':
    case 'RecordNotFound':
      return t('error.database-error');

    default:
      noOtherVariants(error);
  }
};
