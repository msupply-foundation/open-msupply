import {
  useMutation,
  InsertStocktakeInput,
  FnUtils,
} from '@openmsupply-client/common';
import { useStocktakeGraphQL } from '../useStocktakeGraphQL';
import { STOCKTAKE } from './keys';

export type CreateStocktakeInput = Omit<InsertStocktakeInput, 'id'>;

export function useStocktake() {
  // TODO: Move get/delete/update methods here
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (insertStockLineInput: CreateStocktakeInput) => {
    const result = await createMutation(insertStockLineInput);
    if (result.insertStocktake.__typename === 'StocktakeNode') {
      return result.insertStocktake.id;
    }
  };

  return {
    create: { create, isCreating, createError },
  };
}

const useCreate = () => {
  const { stocktakeApi, storeId, queryClient } = useStocktakeGraphQL();

  const mutationFn = async ({
    masterListId,
    locationId,
    createBlankStocktake,
    expiresBefore,
    isInitialStocktake,
    comment,
    description,
  }: CreateStocktakeInput) => {
    return await stocktakeApi.insertStocktake({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        masterListId,
        locationId,
        createBlankStocktake,
        expiresBefore,
        isInitialStocktake,
        comment,
        description,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([STOCKTAKE]),
  });
};
