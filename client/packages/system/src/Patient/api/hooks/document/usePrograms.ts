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
        nodes: programs.nodes.map(node => {
          // only take the latest status event
          const events = node.events
            .filter(e => e.type === 'status' && e.name)
            .slice(0, 1);
          return { ...node, events, id: node.name } as ProgramRowFragmentWithId;
        }),
        totalCount: programs.totalCount,
      }))
    ),
  };
};
