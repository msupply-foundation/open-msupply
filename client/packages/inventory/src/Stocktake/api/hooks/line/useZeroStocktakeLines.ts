import { useNotification, useTranslation } from '@openmsupply-client/common';
import { useSaveStocktakeLines } from './useStocktakeSaveLines';
import { ReasonOptionRowFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment } from '../../operations.generated';

export const useZeroStocktakeLines = (
  selectedRows: StocktakeLineFragment[]
) => {
  const { saveAndMapStructuredErrors } = useSaveStocktakeLines();
  const t = useTranslation();
  const { error, success } = useNotification();

  const onZeroQuantities = async (
    reasonOption: ReasonOptionRowFragment | null
  ) => {
    try {
      const { errorMessages } = await saveAndMapStructuredErrors(
        selectedRows.map(line => ({
          ...line,
          countedNumberOfPacks: 0,
          isUpdated: true,
          countThisLine: true,
          reasonOption,
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

  const allSelectedItemsAreVaccines = selectedRows.every(
    row => row.item.isVaccine
  );

  return { onZeroQuantities, allSelectedItemsAreVaccines };
};
