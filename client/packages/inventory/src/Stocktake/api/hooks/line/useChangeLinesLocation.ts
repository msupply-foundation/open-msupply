import { useNotification, useTranslation } from '@openmsupply-client/common';
import { useSaveStocktakeLines } from './useStocktakeSaveLines';
import { LocationRowFragment } from '@openmsupply-client/system';
import { useSelectedRows } from '../utils/useSelectedRows';

export const useChangeLinesLocation = () => {
  const { saveAndMapStructuredErrors } = useSaveStocktakeLines();
  const t = useTranslation('inventory');
  const { error, success } = useNotification();

  const selectedRows = useSelectedRows();

  const onChangeLocations = async (location: LocationRowFragment | null) => {
    try {
      const { errorMessages } = await saveAndMapStructuredErrors(
        selectedRows.map(line => ({
          ...line,
          isUpdated: true,
          countThisLine: true,
          location,
        }))
      );

      if (errorMessages) {
        errorMessages.forEach(errorMessage => error(errorMessage)());
        return;
      }

      success(t('messages.changed-location', { count: selectedRows.length }))();
    } catch (err) {
      throw err;
    }
  };

  return onChangeLocations;
};
