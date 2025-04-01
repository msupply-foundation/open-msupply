import {
  InsertAssetCatalogueItemInput,
  useMutation,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';

export const useAsset = () => {
  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
    invalidateQueries: createInvalidateQueries,
  } = useCreateAssetItem();

  return {
    create: {
      create: createMutation,
      isCreating,
      createError,
      createInvalidateQueries,
    },
  };
};

const useCreateAssetItem = () => {
  const { assetApi, storeId, queryClient } = useAssetGraphQL();

  const mutationFn = async (input: InsertAssetCatalogueItemInput) => {
    const result = await assetApi.insertAssetCatalogueItem({
      input,
      storeId,
    });

    return result.centralServer.assetCatalogue.insertAssetCatalogueItem;
  };

  const invalidateQueries = () => queryClient.invalidateQueries(ASSET);

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([ASSET]);
    },
    onError: e => {
      console.error(e);
    },
  });

  return {
    ...mutation,
    invalidateQueries,
  };
};
