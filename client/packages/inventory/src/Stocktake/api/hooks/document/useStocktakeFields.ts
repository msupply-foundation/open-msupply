import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { StocktakeFragment } from '../../operations.generated';
import { useStocktake, useStocktakeId } from './useStocktake';
import { useUpdateStocktake } from './useUpdateStocktake';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakeFields = <
  KeyOfStocktake extends keyof StocktakeFragment,
>(
  keys: KeyOfStocktake | KeyOfStocktake[]
): FieldSelectorControl<StocktakeFragment, KeyOfStocktake> => {
  const stocktakeId = useStocktakeId();
  const { mutateAsync } = useUpdateStocktake();
  const { data } = useStocktake();
  const api = useStocktakeApi();

  return useFieldsSelector(
    api.keys.detail(stocktakeId),
    () => api.get.byId(stocktakeId),
    (patch: Partial<StocktakeFragment>) =>
      mutateAsync({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
