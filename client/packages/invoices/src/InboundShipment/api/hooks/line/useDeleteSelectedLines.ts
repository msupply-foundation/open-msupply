import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundRows } from './useInboundRows';

export const useDeleteSelectedLines = (): (() => void) => {
  const { items, lines } = useInboundRows();
  const { mutateAsync } = useDeleteInboundLines();
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation('replenishment');

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  const onDelete = async () => {
    mutateAsync(selectedRows)
      // .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-lines'),
      deleteSuccess: t('messages.deleted-lines', {
        number: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};
