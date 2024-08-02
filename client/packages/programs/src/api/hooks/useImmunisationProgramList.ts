import {
  FilterByWithBoolean,
  SortBy,
  ProgramNode,
  ProgramSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { ImmunisationProgramFragment } from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { LIST, IMMUNISATION_PROGRAM } from './keys';

type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<ImmunisationProgramFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export const useImmunisationProgramList = (queryParams: ListParams) => {
  const { api, storeId } = useProgramsGraphQL();

  const {
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [IMMUNISATION_PROGRAM, LIST, sortBy, first, offset, filterBy];
  const queryFn = async (): Promise<{
    nodes: ImmunisationProgramFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      isImmunisation: true,
    };
    const query = await api.immunisationPrograms({
      storeId,
      first: first,
      offset: offset,
      key: toSortField(sortBy),
      desc: sortBy.isDesc,
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

const toSortField = (sortBy: SortBy<ProgramNode>): ProgramSortFieldInput => {
  switch (sortBy.key) {
    case 'name':
      return ProgramSortFieldInput.Name;
    default: {
      return ProgramSortFieldInput.Name;
    }
  }
};
