import {
  FilterBy,
  useQuery,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { EncounterRowFragmentWithId } from '../..';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounters = (filterBy?: FilterBy) => {
  const api = useEncounterApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'type', dir: 'asc' },
  });
  const params = {
    ...queryParams,
    filterBy,
  };
  return {
    ...useQuery(api.keys.paramList(params), () =>
      api.get.list(params).then(encounters => ({
        nodes: encounters.nodes.map(
          node => ({ ...node, id: node.name } as EncounterRowFragmentWithId)
        ),
        totalCount: encounters.totalCount,
      }))
    ),
  };
};
