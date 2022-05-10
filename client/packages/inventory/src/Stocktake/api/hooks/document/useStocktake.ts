import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { StocktakeFragment } from '../../operations.generated';
import { useStocktakeApi } from '../utils/useStocktakeApi';

// helper function, only only within the ./hooks folder, so not lifted out to its own file
// in here, rather than index, to prevent dependency issues
// used by [useStocktake, useStocktakeFields, useStocktakeDeleteLines, useStocktakeLines, useStocktakeSaveLines]
export const useStocktakeNumber = () => {
  const { stocktakeNumber = '' } = useParams();
  return stocktakeNumber;
};

export const useStocktake = (): UseQueryResult<StocktakeFragment> => {
  const stocktakeNumber = useStocktakeNumber();
  const api = useStocktakeApi();
  return useQuery(
    api.keys.detail(stocktakeNumber),
    () => api.get.byNumber(stocktakeNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
