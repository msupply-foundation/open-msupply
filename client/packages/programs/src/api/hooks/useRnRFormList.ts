import {
  FilterByWithBoolean,
  SortBy,
  useQuery,
  RnRFormSortFieldInput,
} from '@openmsupply-client/common';
import { RnRFormFragment } from '../operations.generated';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { LIST, RNR_FORM } from './keys';

type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<RnRFormFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export const useRnRFormList = ({
  sortBy = {
    key: 'name',
    direction: 'asc',
  },
  first,
  offset,
  filterBy,
}: ListParams) => {
  const { api, storeId } = useProgramsGraphQL();

  const queryKey = [RNR_FORM, LIST, sortBy, first, offset, filterBy];
  const queryFn = async (): Promise<{
    nodes: RnRFormFragment[];
    totalCount: number;
  }> => {

    const query = await api.rnrForms({
      storeId,
      first: first,
      offset: offset,
      key: toSortField(sortBy),
      desc: sortBy.isDesc,
      filter: filterBy,
    });
    const { nodes, totalCount } = query?.rAndRForms ?? {
      nodes: [],
      totalCount: 0,
    };
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};

const toSortField = (sortBy: SortBy<RnRFormFragment>): RnRFormSortFieldInput => {
  switch (sortBy.key) {
    case 'periodName':
      return RnRFormSortFieldInput.Period;
    case 'programName':
      return RnRFormSortFieldInput.Program;
    case 'supplierName':
      return RnRFormSortFieldInput.SupplierName;
    case 'createdDatetime':
      return RnRFormSortFieldInput.CreatedDatetime;
    default: {
      return RnRFormSortFieldInput.CreatedDatetime;
    }
  }
};
