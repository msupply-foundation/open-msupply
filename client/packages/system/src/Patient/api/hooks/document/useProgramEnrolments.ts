import {
  ProgramEnrolmentSortFieldInput,
  SortRule,
  useQuery,
} from '@openmsupply-client/common';
import { ProgramRowFragmentWithId } from '../..';
import { usePatientId } from '../utils/usePatientId';
import { usePatientApi } from '../utils/usePatientApi';
import { ProgramEnrolmentListParams } from '../../api';

export const useProgramEnrolments = (
  sortBy?: SortRule<ProgramEnrolmentSortFieldInput>
) => {
  const api = usePatientApi();

  const patientId = usePatientId();
  const params: ProgramEnrolmentListParams = {
    sortBy: {
      key: sortBy?.key ?? ProgramEnrolmentSortFieldInput.EnrolmentDatetime,
      isDesc: sortBy?.isDesc,
    },
    filterBy: { patientId: { equalTo: patientId } },
  };
  return {
    ...useQuery(api.keys.enrolmentParamList(params), () =>
      api.get.programEnrolments(params).then(programs => ({
        nodes: programs.nodes.map(node => {
          // only take the latest status event
          const events = node.events
            .filter(e => e.type === 'programStatus' && e.data)
            .slice(0, 1);
          return { ...node, events, id: node.name } as ProgramRowFragmentWithId;
        }),
        totalCount: programs.totalCount,
      }))
    ),
  };
};
