import {
  useQueryClient,
  useMutation,
  useTranslation,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useStocktakeNumber } from '../document/useStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';
import { DraftStocktakeLine } from '../../../DetailView/modal/StocktakeLineEdit';
import { UpsertStocktakeLinesMutation } from '../../operations.generated';
import { useStocktakeLineErrorContext } from '../../../context';

export const useSaveStocktakeLines = () => {
  const stocktakeNumber = useStocktakeNumber();
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  const t = useTranslation('inventory');
  const errorsContext = useStocktakeLineErrorContext();

  const mutation = useMutation(api.updateLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktakeNumber)),
  });

  const saveAndMapStructuredErrors = async (lines: DraftStocktakeLine[]) => {
    const result = await mutation.mutateAsync(lines);
    return mapStructuredErrors(result);
  };

  const mapStructuredErrors = (result: UpsertStocktakeLinesMutation) => {
    const insertResults = result.batchStocktake?.insertStocktakeLines || [];
    const updateResults = result.batchStocktake?.updateStocktakeLines || [];

    const errorMessagesMap: { [key: string]: string } = {};

    // First unset error
    errorsContext.unsetAll();
    for (const { response, id } of [...insertResults, ...updateResults]) {
      // No error
      if (response.__typename === 'StocktakeLineNode') continue;

      const { error } = response;
      // Common error for all lines
      if (error.__typename === 'CannotEditStocktake') {
        errorMessagesMap[error.__typename] = t('error.not-editable');
        continue;
      }
      // Line specific errors
      switch (error.__typename) {
        case 'AdjustmentReasonNotProvided':
          errorMessagesMap[error.__typename] = t('error.provide-reason');
          break;
        case 'AdjustmentReasonNotValid':
          errorMessagesMap[error.__typename] = t('error.provide-valid-reason');
          break;
        case 'StockLineReducedBelowZero':
          errorMessagesMap[error.__typename] = t('error.reduced-below-zero');
          break;

        default:
          noOtherVariants(error);
      }

      errorsContext.setError(id, error);
    }

    const errorMessages = Object.values(errorMessagesMap);
    return {
      errorMessages: errorMessages.length === 0 ? undefined : errorMessages,
    };
  };

  return {
    ...mutation,
    saveAndMapStructuredErrors,
  };
};
