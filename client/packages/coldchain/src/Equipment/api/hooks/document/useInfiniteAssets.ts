import {
  useInfiniteQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useAssetApi } from '../utils/useAssetApi';

interface InfiniteAssetProps {
  rowsPerPage: number;
}

export const useInfiniteAssets = ({ rowsPerPage }: InfiniteAssetProps) => {
  const api = useAssetApi();
  const { queryParams } = useUrlQueryParams();

  return useInfiniteQuery({
    queryKey: api.keys.paramList(queryParams),
    queryFn: async ({ pageParam }) => {
      const pageNumber = Number(pageParam);

      const data = await api.get.list({
        ...queryParams,
        first: rowsPerPage,
        offset: rowsPerPage * pageNumber,
      });

      return {
        data,
        pageNumber,
      };
    },
    initialPageParam: 0,
    getNextPageParam: lastPage =>
      (lastPage.pageNumber + 1) * rowsPerPage < (lastPage.data?.totalCount ?? 0)
        ? lastPage.pageNumber + 1
        : undefined,
  });
};
