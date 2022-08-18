import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { ProgramRowFragmentWithId } from '../..';
import { usePatientId } from '../utils/usePatientId';
import { usePatientApi } from '../utils/usePatientApi';

export const usePrograms = () => {
  const api = usePatientApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'type', dir: 'asc' },
  });
  const patientId = usePatientId();
  const params = {
    ...queryParams,
    filterBy: { patientId: { equalTo: patientId } },
  };
  return {
    ...useQuery(api.keys.paramList(params), () =>
      api.get.programs(params).then(programs => ({
        nodes: programs.nodes.map(
          node => ({ ...node, id: node.name } as ProgramRowFragmentWithId)
        ),
        totalCount: programs.totalCount,
      }))
    ),
  };
};
