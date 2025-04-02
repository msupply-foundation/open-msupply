import {
  InsertAssetCatalogueItemInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET } from './keys';

export const useAsset = (assetCatalogueItemId?: string) => {
  const { data, isLoading, error } = useGet(assetCatalogueItemId ?? '');

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
    invalidateQueries: createInvalidateQueries,
  } = useCreateAssetItem();

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: {
      create: createMutation,
      isCreating,
      createError,
      createInvalidateQueries,
    },
  };
};

const useGet = (assetCatalogueItemId: string) => {
  const { assetApi } = useAssetGraphQL();

  const queryFn = async () => {
    const result = await assetApi.assetCatalogueItemById({
      assetCatalogueItemId,
    });

    if (
      result?.assetCatalogueItems.__typename === 'AssetCatalogueItemConnector'
    ) {
      return result?.assetCatalogueItems;
    }
  };
  const query = useQuery({
    queryKey: [ASSET, assetCatalogueItemId],
    queryFn,
    enabled: assetCatalogueItemId !== '',
  });
  return query;
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
