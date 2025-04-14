import {
  FilterByWithBoolean,
  LIST_KEY,
  useQuery,
} from '@openmsupply-client/common';
import { useAssetGraphQL } from '../useAssetGraphQL';
import { ASSET, LOG_REASONS } from './keys';

export const useAssetLogReasonList = (
  filterBy?: FilterByWithBoolean | null
) => {
  const { assetApi, storeId } = useAssetGraphQL();
  const queryKey = [ASSET, storeId, LIST_KEY, LOG_REASONS, filterBy];

  const queryFn = async () => {
    const query = await assetApi.assetLogReasons({
      storeId,
      filter: filterBy,
    });

    const { nodes, totalCount } = query?.assetLogReasons;
    return { nodes, totalCount };
  };

  const query = useQuery({
    queryKey,
    queryFn,
  });
  return query;
};
