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

  return useInfiniteQuery(
    api.keys.paramList(queryParams),
    async ({ pageParam }) => {
      const pageNumber = Number(pageParam ?? 0);

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
    {
      getNextPageParam: lastPage => {
        // Stop fetching if we got fewer items than requested
        if (lastPage.data?.nodes?.length === rowsPerPage) {
          return lastPage.pageNumber + 1;
        }
        return undefined;
      },
    }
  );
};
