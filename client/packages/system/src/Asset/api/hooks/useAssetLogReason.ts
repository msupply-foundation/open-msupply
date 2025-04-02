import {
  AssetLogStatusInput,
  InsertAssetLogReasonInput,
  useMutation,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';

export const useAssetLogReason = () => {
  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreateAssetLogReason();

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useDeleteAssetLogReason();

  return {
    create: {
      create: createMutation,
      isCreating,
      createError,
    },
    delete: {
      delete: deleteMutation,
      isDeleting,
      deleteError,
    },
  };
};

const useCreateAssetLogReason = () => {
  const { assetApi, queryClient } = useAssetGraphQL();

  const mutationFn = async (input: InsertAssetLogReasonInput) => {
    const result = await assetApi.insertAssetLogReason({
      input,
    });

    return result.centralServer.logReason.insertAssetLogReason;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([ASSET]);
    },
    onError: e => {
      console.error(e);
    },
  });
};

const useDeleteAssetLogReason = () => {
  const { assetApi, queryClient } = useAssetGraphQL();

  const mutationFn = async (reasonId: string) => {
    const result = await assetApi.deleteLogReason({
      reasonId,
    });

    return result.centralServer.logReason.deleteLogReason;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([ASSET]);
    },
    onError: e => {
      console.error(e);
    },
  });
};

export const checkLogReasonStatus = (status: string): boolean => {
  switch (status) {
    case AssetLogStatusInput.Decommissioned:
      return true;
    case AssetLogStatusInput.Functioning:
      return true;
    case AssetLogStatusInput.FunctioningButNeedsAttention:
      return true;
    case AssetLogStatusInput.NotFunctioning:
      return true;
    case AssetLogStatusInput.NotInUse:
      return true;
    default:
      return false;
  }
};
