import {
  ProgramEnrolmentSortFieldInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { ProgramEnrolmentListParams } from '../../api';
import { ProgramEnrolmentRowFragment } from '../../operations.generated';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export type ProgramEnrolmentRowFragmentWithId = {
  id: string;
} & ProgramEnrolmentRowFragment;

export const useProgramEnrolmentsPromise = () => {
  const api = useProgramEnrolmentApi();

  return {
    ...useMutation((input: ProgramEnrolmentListParams) => {
      const params: ProgramEnrolmentListParams = {
        sortBy: {
          key:
            input.sortBy?.key ??
            ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
          isDesc: input.sortBy?.isDesc,
        },
        filterBy: input.filterBy,
      };
      return api.programEnrolments(params).then(programs => ({
        nodes: programs.nodes.map(node => {
          // only take the latest status event
          const events = node.events
            .filter(e => e.type === 'programStatus' && e.data)
            .slice(0, 1);
          return {
            ...node,
            events,
            id: node.name,
          } as ProgramEnrolmentRowFragmentWithId;
        }),
        totalCount: programs.totalCount,
      }));
    }),
  };
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
  return {
    ...useQuery(api.keys.list(params), () =>
      api.programEnrolments(params).then(programs => ({
        nodes: programs.nodes.map(node => {
          // only take the latest status event
          const events = node.events
            .filter(e => e.type === 'programStatus' && e.data)
            .slice(0, 1);
          return {
            ...node,
            events,
            id: node.name,
          } as ProgramEnrolmentRowFragmentWithId;
        }),
        totalCount: programs.totalCount,
      }))
    ),
  };
};
