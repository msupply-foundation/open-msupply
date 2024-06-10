import {
  FilterByWithBoolean,
  SortBy,
  useQuery,
  VaccineCourseSortFieldInput,
  VaccineCourseNode,
} from '@openmsupply-client/common';
import { VaccineCourseFragment } from '../operations.generated';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { VACCINE, VACCINELIST } from './keys';

export type CourseListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<VaccineCourseFragment>;
  filterBy?: FilterByWithBoolean | null;
};

export const useVaccineCourseList = (queryParams: CourseListParams) => {
  const { api } = useImmunisationGraphQL();

  const {
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [VACCINE, VACCINELIST, sortBy, first, offset, filterBy];
  const queryFn = async (): Promise<{
    nodes: VaccineCourseFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
    };
    const query = await api.vaccineCourses({
      first: first,
      offset: offset,
      key: toSortField(sortBy),
      desc: sortBy.isDesc,
      filter,
    });
    const { nodes, totalCount } = query?.vaccineCourses ?? {
      nodes: [],
      totalCount: 0,
    };
    return { nodes, totalCount };
  };

  const query = useQuery({ queryKey, queryFn });
  return query;
};

const toSortField = (
  sortBy: SortBy<VaccineCourseNode>
): VaccineCourseSortFieldInput => {
  switch (sortBy.key) {
    case 'name':
      return VaccineCourseSortFieldInput.Name;
    default: {
      return VaccineCourseSortFieldInput.Name;
    }
  }
};
