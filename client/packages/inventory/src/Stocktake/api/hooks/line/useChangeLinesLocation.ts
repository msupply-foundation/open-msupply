import { useNotification, useTranslation } from '@openmsupply-client/common';
import { useSaveStocktakeLines } from './useStocktakeSaveLines';
import { LocationRowFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment } from '../../operations.generated';

export const useChangeLinesLocation = (
  selectedRows: StocktakeLineFragment[]
) => {
  const { saveAndMapStructuredErrors } = useSaveStocktakeLines();
  const t = useTranslation();
  const { error, success, errorWithDetail } = useNotification();

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
      errorWithDetail(String(err))();
    }
  };

  return onChangeLocations;
};
