import { useNotification, useTranslation } from '@openmsupply-client/common';
import { useSaveStocktakeLines } from './useStocktakeSaveLines';
import { ReasonOptionRowFragment } from '@openmsupply-client/system';
import { useSelectedRows } from '../utils/useSelectedRows';

export const useZeroStocktakeLines = () => {
  const { saveAndMapStructuredErrors } = useSaveStocktakeLines();
  const t = useTranslation();
  const { error, success } = useNotification();

  const selectedRows = useSelectedRows();

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

  return onZeroQuantities;
};
