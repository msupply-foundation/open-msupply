import { useMutation, SortBy } from '@openmsupply-client/common';
import { StocktakeRowFragment } from '../../operations.generated';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useStocktakesAll = (sortBy: SortBy<StocktakeRowFragment>) => {
  const api = useStocktakeApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), api.get.listAll({ sortBy })),
  };
};
