import { MasterListLineResolver } from './masterListLine';
import { createListResponse } from './utils';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';
import { db } from './../../data/database';

import { ResolvedMasterList, ListResponse } from './../../data/types';
import { MasterListsQueryVariables } from '@openmsupply-client/common/src/types/schema';

export const MasterListResolver = {
  byId: (id: string): ResolvedMasterList => {
    const masterList = db.masterList.get.byId(id);
    const lines = MasterListLineResolver.byMasterListId(id);
    const resolvedLines = lines.nodes.map(line =>
      MasterListLineResolver.byId(line.id)
    );

    return {
      __typename: 'MasterListNode',
      lines: { ...lines, nodes: resolvedLines },
      ...masterList,
    };
  },
  list: (
    params?: MasterListsQueryVariables | null
  ): ListResponse<ResolvedMasterList, 'MasterListConnector'> => {
    const masterLists = db.masterList.get.list();

    const { filter, offset, first, key, desc } = params ?? {};

    const resolved = masterLists.map(masterList => {
      return MasterListResolver.byId(masterList.id);
    });

    let filtered = resolved;
    if (filter) {
      if (filter.name) {
        console.info('filter.name', filter.name);
        filtered = filtered.filter(masterList => {
          return (
            masterList.name
              .toLowerCase()
              .indexOf((filter.name?.like || '').toLowerCase()) !== -1
          );
        });
      }

      if (filter.id) {
        filtered = filtered.filter(masterList => {
          return masterList.id === filter.id?.equalTo;
        });
      }
    }

    const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

    if (key) {
      paged.sort(getDataSorter(key, !!desc));
    }

    return createListResponse(filtered.length, paged, 'MasterListConnector');
  },
};
