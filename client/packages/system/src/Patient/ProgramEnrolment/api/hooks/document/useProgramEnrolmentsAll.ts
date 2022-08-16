import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { ProgramRowFragmentWithId } from '../..';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolmentsAll = () => {
  const api = useProgramEnrolmentApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'type', dir: 'asc' },
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams).then(programs => ({
        nodes: programs.nodes.map(
          node => ({ ...node, id: node.name } as ProgramRowFragmentWithId)
        ),
        totalCount: programs.totalCount,
      }))
    ),
  };
};
