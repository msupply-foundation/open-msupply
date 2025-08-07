import {
  ProgramFilterInput,
  ProgramSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { ProgramFragment } from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { LIST, PROGRAM } from './keys';

export const useProgramList = ({
  isImmunisation,
  itemId,
  clearCache = true,
}: {
  isImmunisation?: boolean;
  itemId?: string;
  clearCache?: boolean;
} = {}) => {
  const { api, storeId } = useProgramsGraphQL();

  const queryKey = [PROGRAM, LIST, clearCache];
  const queryFn = async (): Promise<{
    nodes: ProgramFragment[];
    totalCount: number;
  }> => {
    const filter: ProgramFilterInput = {
      isImmunisation,
      existsForStoreId: {
        equalTo: storeId,
      },
      itemId: itemId ? { equalTo: itemId } : undefined,
    };

    const query = await api.programs({
      storeId,
      first: 1000,
      offset: 0,
      key: ProgramSortFieldInput.Name,
      desc: false,
      filter,
    });
    const { nodes, totalCount } = query?.programs ?? {
      nodes: [],
      totalCount: 0,
    };
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};
