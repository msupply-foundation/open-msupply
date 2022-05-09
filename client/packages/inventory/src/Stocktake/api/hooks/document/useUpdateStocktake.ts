import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useUpdateStocktake = () => {
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};
