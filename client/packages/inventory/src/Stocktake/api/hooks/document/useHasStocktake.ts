import { useQuery } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useHasStocktake = () => {
  const api = useStocktakeApi();

  return {
    ...useQuery(api.keys.hasStocktake(), api.get.hasStocktake()),
  };
};
