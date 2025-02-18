import {
  useQueryClient,
  useMutation,
  useTranslation,
  useTableStore,
  useDeleteConfirmation,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useResponse } from '..';
import { useResponseNumber } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';
import { useResponseLines } from './useResponseLines';
import { useResponseRequisitionLineErrorContext } from '../../../context';

export const useDeleteResponseLines = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useResponseApi();
  const requestNumber = useResponseNumber();
  const { lines } = useResponseLines();
  const isDisabled = useResponse.utils.isDisabled();
  const { mutateAsync } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  const errorsContext = useResponseRequisitionLineErrorContext();

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    let result = await mutateAsync(selectedRows).catch(err => {
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

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-requisition-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: (err: Error) =>
        err.message || t('label.cant-delete-disabled-requisition'),
    },
  });

  return { selectedRows, confirmAndDelete };
};
