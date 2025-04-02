import {
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

  return {
    create: {
      create: createMutation,
      isCreating,
      createError,
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
