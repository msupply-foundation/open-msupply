import {
  useNavigate,
  useQueryClient,
  useMutation,
} from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useInsertStocktake = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useStocktakeApi();

  return useMutation(api.insertStocktake, {
    onSuccess: ({ stocktakeNumber }) => {
      navigate(String(stocktakeNumber));
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
