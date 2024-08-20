import { useQuery } from '@openmsupply-client/common';
import { useRnRGraphQL } from '../useRnRGraphQL';
import { SCHEDULE, LIST } from './keys';

export const useSchedulesAndPeriods = (programId: string) => {
  const { api, storeId } = useRnRGraphQL();

  const queryKey = [SCHEDULE, LIST, programId];
  const queryFn = async () => {
    const query = await api.schedulesAndPeriods({
      storeId,
      programId,
    });

    return query?.schedulesWithPeriodsByProgram;
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
