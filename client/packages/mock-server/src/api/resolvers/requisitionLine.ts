import { ResolvedRequisitionLine, ListResponse } from './../../data/types';
import { db } from '../../data/database';
import { createListResponse } from './utils';

export const requisitionLineResolver = {
  byId: (id: string): ResolvedRequisitionLine => {
    const requisitionLine = db.requisitionLine.get.byId(id);
    if (!requisitionLine) {
      throw new Error(`RequisitionLine with id ${id} not found`);
    }

    return {
      ...requisitionLine,
      __typename: 'RequisitionLineNode',
    };
  },
  byRequisitionId: (
    requisitionId: string
  ): ListResponse<ResolvedRequisitionLine, 'RequisitionLineConnector'> => {
    const requisitionLines =
      db.requisitionLine.get.byRequisitionId(requisitionId);

    const resolvedLines = requisitionLines.map(requisitionLine =>
      requisitionLineResolver.byId(requisitionLine.id)
    );

    return createListResponse(
      resolvedLines.length,
      resolvedLines,
      'RequisitionLineConnector'
    );
  },
};
