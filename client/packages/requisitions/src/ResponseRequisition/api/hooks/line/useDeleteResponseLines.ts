import {
  useQueryClient,
  useMutation,
  useTranslation,
  useTableStore,
  useDeleteConfirmation,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useResponse } from '..';
import { useResponseId } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';
import { useResponseLines } from './useResponseLines';
import { useResponseRequisitionLineErrorContext } from '../../../context';

export const useDeleteResponseLines = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useResponseApi();
  const responseId = useResponseId();
  const { lines } = useResponseLines();
  const isDisabled = useResponse.utils.isDisabled();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(responseId)),
  });
  const errorsContext = useResponseRequisitionLineErrorContext();
  const { linkedRequisition } = useResponse.document.fields([
    'linkedRequisition',
  ]);

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    const result = await mutateAsync(selectedRows).catch(err => {
      console.error(err);
    });
    errorsContext.unsetAll();

    result?.forEach(line => {
      if (line.response.__typename === 'DeleteResponse') return;

      const { error } = line.response;

      switch (error.__typename) {
        case 'RecordNotFound':
          throw Error(t('messages.record-not-found'));
        case 'CannotEditRequisition':
          throw Error(t('messages.cannot-edit-requisition'));
        case 'CannotDeleteLineLinkedToShipment': {
          errorsContext.setError(line.id, error);
          throw Error(t('message.cannot-delete-line-linked-to-shipment'));
        }
        case 'ForeignKeyError':
          throw Error(t('error.database-error'));
        default:
          noOtherVariants(error);
      }
    });
  };

  interface handleCantDelete {
    isDisabled: boolean;
    hasLinkedRequisition: boolean;
  }

  const handleCantDelete = ({
    isDisabled,
    hasLinkedRequisition,
  }: handleCantDelete) => {
    if (isDisabled) return t('label.cant-delete-disabled-requisition');
    if (hasLinkedRequisition)
      return t('messages.cannot-delete-linked-requisition');
    return (err: Error) => err.message;
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled && !linkedRequisition,
    messages: {
      confirmMessage: t('messages.confirm-delete-requisition-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: handleCantDelete({
        isDisabled,
        hasLinkedRequisition: !!linkedRequisition,
      }),
    },
  });

  return { selectedRows, confirmAndDelete };
};
