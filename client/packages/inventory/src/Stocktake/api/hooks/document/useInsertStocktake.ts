import {
  useNavigate,
  useQueryClient,
  useMutation,
} from '@openmsupply-client/common';
import { StockLineFragment } from '@openmsupply-client/system';
import { useStocktakeApi } from '../utils/useStocktakeApi';

export const useInsertStocktake = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useStocktakeApi();
  return useMutation<
    { __typename: 'StocktakeNode'; id: string; stocktakeNumber: number },
    unknown,
    {
      description: string;
      items: { itemId: string; stockLines?: StockLineFragment[] }[] | undefined;
    },
    unknown
  >(
    ({
      description,
      items,
    }: {
      description: string;
      items?: {
        itemId: string;
        stockLines?: StockLineFragment[];
      }[];
    }) => api.insertStocktake(description, items),
    {
      onSuccess: ({ stocktakeNumber }) => {
        navigate(String(stocktakeNumber));
        return queryClient.invalidateQueries(api.keys.base());
      },
    }
  );
};
