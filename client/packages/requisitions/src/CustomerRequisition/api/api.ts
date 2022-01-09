import {
  UpdateCustomerRequisitionInput,
  NameResponse,
  RequisitionQuery,
  RequisitionLineConnector,
  OmSupplyApi,
  ConnectorError,
} from '@openmsupply-client/common';
import { Requisition } from '../../types';

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

export const requisitionToInput = (
  requisition: Partial<Requisition> & { id: string }
): UpdateCustomerRequisitionInput => {
  return {
    id: requisition.id,
    orderDate: requisition.requisitionDate?.toISOString(),
    otherPartyId: requisition.otherParty?.id,
    comment: requisition.comment,
    theirReference: requisition.theirReference,
    color: requisition.color,
    status: requisition.status,
  };
};

export const CustomerRequisitionApi = {
  get: {
    byId:
      (api: OmSupplyApi) =>
      async (id: string): Promise<Requisition> => {
        const result = await api.requisition({ id });
        const requisition = requisitionGuard(result);
        const lines = linesGuard(requisition.lines);
        const otherParty = otherPartyGuard(requisition.otherParty);

        return {
          ...requisition,
          lines,
          otherParty,
          orderDate: requisition.orderDate
            ? new Date(requisition.orderDate)
            : null,
          requisitionDate: requisition.requisitionDate
            ? new Date(requisition.requisitionDate)
            : null,
          otherPartyName: otherParty.name,
        };
      },
  },

  update:
    (api: OmSupplyApi) =>
    async (
      patch: Partial<Requisition> & { id: string }
    ): Promise<UpdateCustomerRequisitionInput> => {
      const input = requisitionToInput(patch);
      const result = await api.updateCustomerRequisition({ input });

      const { updateCustomerRequisition } = result;

      if (updateCustomerRequisition.__typename === 'RequisitionNode') {
        return input;
      }

      throw new Error('Unable to update requisition');
    },
};
