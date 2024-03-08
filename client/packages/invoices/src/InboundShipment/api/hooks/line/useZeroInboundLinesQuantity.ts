import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useInboundRows } from './useInboundRows';
import { useSaveInboundLines } from './useSaveInboundLines';

export const useZeroInboundLinesQuantity = (): (() => void) => {
  const { items, lines } = useInboundRows();
  const { mutateAsync } = useSaveInboundLines();
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation('replenishment');

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) =>
              lines.map(line => ({
                ...line,
                numberOfPacks: 0,
                isUpdated: true,
              }))
            )
            .flat()
        : lines
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(line => ({
              ...line,
              numberOfPacks: 0,
              isUpdated: true,
            }));
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
