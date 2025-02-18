import { useQuery } from '@openmsupply-client/common';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { LIST, PERIOD } from './keys';
import { PeriodFragment } from '@openmsupply-client/requisitions';

export const usePeriodList = (programId?: string, enabled?: boolean) => {
  const { api, storeId } = useProgramsGraphQL();

  const queryKey = [PERIOD, LIST];
  const queryFn = async (): Promise<{
    nodes: PeriodFragment[];
    totalCount: number;
  }> => {
    const query = await api.periods({
      storeId,
      ...(programId ? { programId } : {}),
    });
    const { nodes, totalCount } = query?.periods ?? {
      nodes: [],
      totalCount: 0,
    };
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn, enabled });
  return query;
};
