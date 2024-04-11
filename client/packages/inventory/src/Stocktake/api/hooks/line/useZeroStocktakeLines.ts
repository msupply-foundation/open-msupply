import {
  useNotification,
  useTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { useSaveStocktakeLines } from './useStocktakeSaveLines';
import { useStocktakeRows } from './useStocktakeRows';
import { useIsStocktakeDisabled } from '../utils/useIsStocktakeDisabled';
import { InventoryAdjustmentReasonRowFragment } from 'packages/system/src';
import { useEffect } from 'react';

export const useZeroStocktakeLines = (onCancel: () => void) => {
  const { items, lines } = useStocktakeRows();
  const { saveAndMapStructuredErrors } = useSaveStocktakeLines();
  const isDisabled = useIsStocktakeDisabled();
  const t = useTranslation('inventory');
  const { error, info, success } = useNotification();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .flatMap(({ lines }) => lines)
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  useEffect(() => {
    if (!selectedRows.length) {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
      onCancel();
    } else if (isDisabled) {
      const cannotReduceSnack = info(t('error.is-locked'));
      cannotReduceSnack();
      onCancel();
    }
  }, []);

  const onZeroQuantities = async (
    inventoryAdjustmentReason: InventoryAdjustmentReasonRowFragment | null
  ) => {
    try {
      const { errorMessages } = await saveAndMapStructuredErrors(
        selectedRows.map(line => ({
          ...line,
          countedNumberOfPacks: 0,
          isUpdated: true,
          countThisLine: true,
          inventoryAdjustmentReason,
        }))
      );

      if (errorMessages) {
        errorMessages.forEach(errorMessage => error(errorMessage)());
        return;
      }

      success(t('messages.reduced-to-zero', { count: selectedRows.length }))();
    } catch (err) {
      throw err;
    }
  };

  return onZeroQuantities;
};
