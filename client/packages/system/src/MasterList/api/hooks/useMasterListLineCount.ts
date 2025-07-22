import { COUNT_KEY, useQuery } from '@openmsupply-client/common';
import { useMasterListGraphQL } from '../useMasterListGraphQL';
import { MASTER_LIST } from './keys';

export const useMasterListLineCount = (masterListId?: string) => {
  const { masterListApi, storeId } = useMasterListGraphQL();

  const queryKey = [MASTER_LIST, storeId, COUNT_KEY, masterListId];

  const queryFn = async () => {
    const query = await masterListApi.masterListLineCount({
      masterListId: masterListId || '',
      storeId,
    });
    const { totalCount } = query?.masterListLines ?? {};
    return totalCount;
  };

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
    enabled: !!masterListId,
  });

  return {
    data,
    isLoading,
    isError,
  };
};
