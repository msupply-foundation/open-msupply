import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useReturns } from '../..';
import { useOutboundReturnRows } from './useOutboundReturnRows';
import { useOutboundReturnIsDisabled } from '../utils/useOutboundReturnIsDisabled';

export const useDeleteSelectedOutboundReturnLines = ({
  returnId,
}: {
  returnId: string;
}): (() => void) => {
  const { items, lines } = useOutboundReturnRows();
  const isDisabled = useOutboundReturnIsDisabled();
  const t = useTranslation('distribution');

  const { mutateAsync: updateLines } = useReturns.lines.updateOutboundLines();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })?.map(({ id }) => ({
      id,
      stockLineId: '',
      numberOfPacksToReturn: 0,
    })) || [];

  const onDelete = async () => {
    await updateLines({
      outboundReturnId: returnId,
      outboundReturnLines: selectedRows,
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
