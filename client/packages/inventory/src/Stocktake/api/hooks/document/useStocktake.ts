import {
  useParams,
  UseQueryResult,
  useQuery,
} from '@openmsupply-client/common';
import { StocktakeFragment } from '../../operations.generated';
import { useStocktakeApi } from '../utils/useStocktakeApi';

// helper function, only within the ./hooks folder, so not lifted out to its own file
// in here, rather than index, to prevent dependency issues
// used by [useStocktake, useStocktakeFields, useStocktakeDeleteLines, useStocktakeLines, useStocktakeSaveLines]
export const useStocktakeId = () => {
  const { id = '' } = useParams();
  return id;
};

export const useStocktake = (): UseQueryResult<StocktakeFragment> => {
  const id = useStocktakeId();
  const api = useStocktakeApi();
  return useQuery(
    api.keys.detail(id),
    () => api.get.byId(id),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};
