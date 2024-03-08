import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useInboundRows } from './useInboundRows';
import { useZeroInboundLineQuantity } from './useZeroInboundLineQuantity';

export const useZeroInboundLinesQuantity = (): (() => void) => {
  const { items, lines } = useInboundRows();
  const { mutateAsync } = useZeroInboundLineQuantity();
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

  const onZeroQuantities = async () => {
    await mutateAsync(selectedRows).catch(err => {
      throw err;
    });
  };

  const confirmAndZeroLines = useDeleteConfirmation({
    selectedRows,
    deleteAction: onZeroQuantities,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-zero-shipment-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.zero-line-quantities', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-zero-quantity-disabled'),
    },
  });

  return confirmAndZeroLines;
};
