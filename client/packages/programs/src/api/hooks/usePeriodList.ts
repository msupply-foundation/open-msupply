import {
  PeriodFilterInput,
  useInfiniteQuery,
} from '@openmsupply-client/common';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { LIST, PERIOD } from './keys';
import { PeriodFragment } from '@openmsupply-client/requisitions';

export const usePeriodList = (
  rowsPerPage: number,
  programId?: string,
  enabled?: boolean,
  filterBy?: PeriodFilterInput
) => {
  const { api, storeId } = useProgramsGraphQL();

  const queryKey = [PERIOD, LIST];
  const queryFn = async ({
    pageParam,
  }: {
    pageParam?: number;
  }): Promise<{
    data: {
      nodes: PeriodFragment[];
      totalCount: number;
    };
    pageNumber: number;
  }> => {
    const pageNumber = Number(pageParam ?? 0);

    const query = await api.periods({
      storeId,
      first: rowsPerPage,
      offset: rowsPerPage * pageNumber,
      filter: filterBy,
      ...(programId ? { programId } : {}),
    });

    const { nodes, totalCount } = query?.periods ?? {
      nodes: [],
      totalCount: 0,
    };

    return { data: { nodes, totalCount }, pageNumber };
  };

  const query = useInfiniteQuery({ queryKey, queryFn, enabled });
  return query;
};
