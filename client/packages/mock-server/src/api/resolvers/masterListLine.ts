import { ResolvedMasterListLine, ListResponse } from './../../data/types';
import { db } from '../../data/database';
import { createListResponse } from './utils';
import { itemResolver } from './item';

export const MasterListLineResolver = {
  byId: (id: string): ResolvedMasterListLine => {
    const masterListLine = db.masterListLine.get.byId(id);
    if (!masterListLine) {
      throw new Error(`MasterListLine with id ${id} not found`);
    }
    const item = itemResolver.byId(masterListLine.itemId);

    return {
      ...masterListLine,
      item: {
        ...item,
        availableBatches: {
          ...item.availableBatches,
          nodes: item.availableBatches.nodes.map(availableBatch => ({
            ...availableBatch,
            __typename: 'StockLineNode',
          })),
        },
      },
      __typename: 'MasterListLineNode',
    };
  },
  byMasterListId: (
    MasterListId: string
  ): ListResponse<ResolvedMasterListLine, 'MasterListLineConnector'> => {
    const MasterListLines = db.masterListLine.get.byMasterListId(MasterListId);

    const resolvedLines = MasterListLines.map(MasterListLine =>
      MasterListLineResolver.byId(MasterListLine.id)
    );

    return createListResponse(
      resolvedLines.length,
      resolvedLines,
      'MasterListLineConnector'
    );
  },
};
