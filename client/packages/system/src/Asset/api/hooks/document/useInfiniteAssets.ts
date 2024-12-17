import {
  FilterByWithBoolean,
  useInfiniteQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

interface useAssetsProps {
  categoryId?: string;
  filter?: FilterByWithBoolean;
  rowsPerPage: number;
}

export const useInfiniteAssets = ({
  categoryId,
  filter,
  rowsPerPage,
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

  return useInfiniteQuery(api.keys.paramList(params), async ({ pageParam }) => {
    const pageNumber = Number(pageParam ?? 0);

    const data = await api.get.list({
      ...params,
      first: rowsPerPage,
      offset: rowsPerPage * pageNumber,
    });

    return {
      data,
      pageNumber,
    };
  });
};
