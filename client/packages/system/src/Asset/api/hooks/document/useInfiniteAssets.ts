import {
  FilterByWithBoolean,
  useInfiniteQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';
import { AssetCatalogueItemFragment } from '../../operations.generated';

type AssetResponse = {
  totalCount: number;
  nodes: AssetCatalogueItemFragment[];
};

interface useAssetsProps {
  categoryId?: string;
  filter?: FilterByWithBoolean;
  getNextPageParam?: (
    lastPage: AssetResponse,
    allPages: AssetResponse[]
  ) => unknown;
}

export const useInfiniteAssets = ({
  categoryId,
  getNextPageParam,
  filter,
}: useAssetsProps) => {
  const { queryParams } = useUrlQueryParams({
    filters: [
      { key: 'code' },
      { key: 'manufacturer' },
      { key: 'model' },
      { key: 'categoryId', condition: 'equalTo' },
      { key: 'typeId', condition: 'equalTo' },
    ],
  });
  const api = useAssetApi();
  const queryFilter =
    categoryId === undefined
      ? queryParams.filterBy
      : { ...queryParams.filterBy, categoryId: { equalTo: categoryId } };
  const filterBy = { ...queryFilter, ...filter };
  const params = { ...queryParams, filterBy };

  return useInfiniteQuery(
    api.keys.paramList(params),
    ({ pageParam }) =>
      api.get.list({ ...params, offset: 0, first: 25, ...pageParam }),
    { getNextPageParam }
  );
};
