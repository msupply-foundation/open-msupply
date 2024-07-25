import {
  ProgramFilterInput,
  ProgramSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { ProgramFragment } from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { LIST, PROGRAM } from './keys';

export const useProgramList = () => {
  const { api, storeId } = useProgramsGraphQL();

  const queryKey = [PROGRAM, LIST];
  const queryFn = async (): Promise<{
    nodes: ProgramFragment[];
    totalCount: number;
  }> => {
    const filter: ProgramFilterInput = {
      isImmunisation: false,
      existsForStoreId: {
        equalTo: storeId,
      },
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
