import {
  useNavigate,
  useQueryClient,
  useMutation,
  InsertStocktakeInput,
} from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useInsertStocktake = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useStocktakeApi();

  return useMutation(
    (input: InsertStocktakeInput) => api.insertStocktake(input),
    {
      onSuccess: ({ id }) => {
        navigate(String(id));
        return queryClient.invalidateQueries(api.keys.base());
      },
    }
  );
};
