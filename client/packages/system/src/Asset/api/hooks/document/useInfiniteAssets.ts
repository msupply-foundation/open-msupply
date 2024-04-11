import {
  FilterByWithBoolean,
  Pagination,
  useInfiniteQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

interface useAssetsProps {
  categoryId?: string;
  filter?: FilterByWithBoolean;
  pagination?: Pagination;
}

export const useInfiniteAssets = ({
  categoryId,
  filter,
  pagination,
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

  return useInfiniteQuery(api.keys.paramList(params), ({ pageParam }) =>
    api.get.list({ ...params, ...pagination, ...pageParam })
  );
};
