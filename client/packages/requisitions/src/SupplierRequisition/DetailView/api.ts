import { RequisitionLineConnector } from './../../../../common/src/types/schema';
import {
  ConnectorError,
  NameResponse,
  OmSupplyApi,
  RequisitionQuery,
} from '@openmsupply-client/common';
import { Requisition, SupplierRequisition } from './../../types';

const otherPartyGuard = (otherParty: NameResponse) => {
  if (otherParty.__typename === 'NameNode') {
    return otherParty;
  } else if (otherParty.__typename === 'NodeError') {
    throw new Error(otherParty.error.description);
  }

  throw new Error('Unknown');
};

const requisitionGuard = (requisitionQuery: RequisitionQuery) => {
  if (requisitionQuery.requisition.__typename === 'RequisitionNode') {
    return requisitionQuery.requisition;
  }

  throw new Error('Could not find the requisition');
};

const linesGuard = (
  requisitionLines: RequisitionLineConnector | ConnectorError
) => {
  if (requisitionLines.__typename === 'RequisitionLineConnector') {
    return requisitionLines.nodes;
  }

  if (requisitionLines.__typename === 'ConnectorError') {
    throw new Error('Error fetching lines for requisition');
  }

  throw new Error('Unknown');
};

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getSupplierRequisitionDetailViewApi = (
  api: OmSupplyApi
): Api<Requisition, SupplierRequisition> => ({
  onRead: async (id: string): Promise<Requisition> => {
    const result = await api.requisition({ id });

    const requisition = requisitionGuard(result);
    const lineNodes = linesGuard(requisition.lines);

    return {
      ...requisition,
      lines: lineNodes,
      otherParty: otherPartyGuard(requisition.otherParty),
    };
  },
  onUpdate: async () => {},
});
