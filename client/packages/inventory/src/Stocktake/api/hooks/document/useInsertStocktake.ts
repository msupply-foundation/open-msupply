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
  return useMutation<
    { __typename: 'StocktakeNode'; id: string; stocktakeNumber: number },
    unknown,
    { description: string; itemIds: string[] | undefined },
    unknown
  >(
    ({ description, itemIds }: { description: string; itemIds?: string[] }) =>
      api.insertStocktake(description, itemIds),
    {
      onSuccess: ({ stocktakeNumber }) => {
        navigate(String(stocktakeNumber));
        return queryClient.invalidateQueries(api.keys.base());
      },
    }
  );
};
