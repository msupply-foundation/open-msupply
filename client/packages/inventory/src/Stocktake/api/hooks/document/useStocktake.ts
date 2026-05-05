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
  return useQuery({
    queryKey: api.keys.detail(id),
    queryFn: () => api.get.byId(id),
    refetchOnMount: false,
    gcTime: 0
  });
};
