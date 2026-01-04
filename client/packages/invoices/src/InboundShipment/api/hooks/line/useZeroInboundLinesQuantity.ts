import {
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useSaveInboundLines } from './useSaveInboundLines';
import { InboundLineFragment } from '../../operations.generated';

export const useZeroInboundLinesQuantity = (
  rowsToZero: InboundLineFragment[],
  resetRowSelection: () => void
): (() => void) => {
  const t = useTranslation();
  const { mutateAsync } = useSaveInboundLines();
  const isDisabled = useIsInboundDisabled();

  const onZeroQuantities = async () => {
    const linesToUpdate = rowsToZero.map(line => ({
      ...line,
      numberOfPacks: 0,
      isUpdated: true,
    }));
    await mutateAsync(linesToUpdate)
      .then(() => resetRowSelection())
      .catch(err => {
        throw err;
      });
  };

  interface handleCantZeroQuantity {
    isDisabled: boolean;
  }

  const handleCantZeroQuantity = ({ isDisabled }: handleCantZeroQuantity) => {
    if (isDisabled) return t('label.cant-zero-quantity-disabled');
    return (err: Error) => err.message;
  };

  const confirmAndZeroLines = useDeleteConfirmation({
    selectedRows: rowsToZero,
    deleteAction: onZeroQuantities,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-zero-shipment-lines', {
        count: rowsToZero.length,
      }),
      deleteSuccess: t('messages.zero-line-quantities', {
        count: rowsToZero.length,
      }),
      cantDelete: handleCantZeroQuantity({ isDisabled }),
    },
  });

  return confirmAndZeroLines;
};
