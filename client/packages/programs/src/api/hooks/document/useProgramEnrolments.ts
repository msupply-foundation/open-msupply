import {
  ProgramEnrolmentSortFieldInput,
  useMutation,
  useQuery,
  keepPreviousData,
} from '@openmsupply-client/common';
import { ProgramEnrolmentListParams } from '../../api';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolmentsPromise = () => {
  const api = useProgramEnrolmentApi();

  return useMutation({
    mutationFn: async (input: ProgramEnrolmentListParams) => {
      const params: ProgramEnrolmentListParams = {
        sortBy: {
          key:
            input.sortBy?.key ?? ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
          isDesc: input.sortBy?.isDesc,
        },
        filterBy: input.filterBy,
      };
      const programs = await api.programEnrolments(params);

      return {
        programs,
      };
    }
  });
};

export const useProgramEnrolments = (input: ProgramEnrolmentListParams) => {
  const api = useProgramEnrolmentApi();

  const params: ProgramEnrolmentListParams = {
    sortBy: {
      key:
        input.sortBy?.key ?? ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
      isDesc: input.sortBy?.isDesc,
    },
    filterBy: input.filterBy,
  };
  return useQuery({
    queryKey: api.keys.list(params),

    queryFn: () =>
      api.programEnrolments(params).then(programs => ({
        nodes: programs.nodes.map(node => {
          // only take the latest status event
          const events = node.activeProgramEvents.nodes
            .filter(e => e.type === 'programStatus' && e.data)
            .slice(0, 1);
          return {
            ...node,
            events,
          };
        }),
        totalCount: programs.totalCount,
      })),

    placeholderData: keepPreviousData
  });
};
