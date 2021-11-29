import { ListResponse, ResolvedRequisition } from './../../data/types';
import { db } from '../../data/database';
import { RequisitionListParameters } from '@openmsupply-client/common/src/types/schema';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';
import { requisitionLineResolver } from './requisitionLine';
import { createListResponse } from './utils';

export const requisitionResolver = {
  get: {
    byId: (id: string): ResolvedRequisition => {
      const requisition = db.requisition.get.byId(id);
      const otherParty = db.get.byId.name(requisition.otherPartyId);
      const lines = requisitionLineResolver.byRequisitionId(id);

      return {
        ...requisition,
        lines,
        otherParty,
        otherPartyName: otherParty.name,
        __typename: 'RequisitionNode',
      };
    },
    list: (
      params: RequisitionListParameters
    ): ListResponse<ResolvedRequisition, 'RequisitionConnector'> => {
      const requisitions = db.requisition.get.list();

      const { filter, page = {}, sort = [] } = params ?? {};

      const { offset = 0, first = 20 } = page ?? {};
      const { key = 'otherPartyName', desc = false } =
        sort && sort[0] ? sort[0] : {};

      const resolved = requisitions.map(requisition => {
        return requisitionResolver.get.byId(requisition.id);
      });

      let filtered = resolved;
      if (filter) {
        if (filter.type) {
          filtered = filtered.filter(requisition => {
            return requisition.type === filter.type?.equalTo;
          });
        }
        if (filter.comment) {
          filtered = filtered.filter(requisition => {
            return (
              requisition.comment &&
              requisition.comment
                .toLowerCase()
                .includes(filter.comment?.like?.toLowerCase() ?? '')
            );
          });
        }
      }

      const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

      if (key) {
        paged.sort(getDataSorter(key, !!desc));
      }

      return createListResponse(filtered.length, paged, 'RequisitionConnector');
    },
  },
};
