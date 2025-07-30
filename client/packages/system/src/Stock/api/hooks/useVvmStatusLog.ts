import { useStockGraphQL } from '../useStockGraphQL';
import {
  InsertVvmStatusLogInput,
  UpdateVvmStatusLogInput,
} from '@common/types';
import { STOCK_LINE } from './keys';
import { useMutation } from '@openmsupply-client/common';

export const useVvmStatusLog = () => {
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

  return {
    create: { createMutation, isCreating, createError },
    update: { updateMutation, isUpdating, updateError },
  };
};

const useCreate = () => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async (input: InsertVvmStatusLogInput) => {
    return await stockApi.insertVvmStatusLog({
      storeId,
      input,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([STOCK_LINE]),
  });
};

const useUpdate = () => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async (input: UpdateVvmStatusLogInput) => {
    return await stockApi.updateVvmStatusLog({
      storeId,
      input,
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([STOCK_LINE]),
  });
};
