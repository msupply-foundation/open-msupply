import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useInboundReturnRows } from './useInboundReturnRows';
import { useInboundReturnIsDisabled } from '../utils/useInboundReturnIsDisabled';
import { useReturns } from '../../../api';

export const useDeleteSelectedInboundReturnLines = ({
  returnId,
}: {
  returnId: string;
}): (() => void) => {
  const { items, lines } = useInboundReturnRows();
  const isDisabled = useInboundReturnIsDisabled();
  const t = useTranslation('distribution');

  const { mutateAsync: updateLines } = useReturns.lines.updateInboundLines();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })?.map(({ id, itemId, packSize, batch, expiryDate }) => ({
      id,
      itemId,
      packSize,
      batch,
      expiryDate,
      numberOfPacksReturned: 0,
    })) || [];

  const onDelete = async () => {
    await updateLines({
      inboundReturnId: returnId,
      inboundReturnLines: selectedRows,
    }).catch(err => {
      throw err;
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};
