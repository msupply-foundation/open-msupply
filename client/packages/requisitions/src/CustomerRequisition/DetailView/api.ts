import {
  ConnectorError,
  NameResponse,
  OmSupplyApi,
  RequisitionQuery,
  RequisitionLineConnector,
  UpdateCustomerRequisitionInput,
  UpdateCustomerRequisitionLineInput,
  InsertCustomerRequisitionLineInput,
  DeleteCustomerRequisitionLineInput,
} from '@openmsupply-client/common';
import {
  Requisition,
  CustomerRequisitionLine,
  CustomerRequisition,
} from '../../types';

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

const createUpdateCustomerRequisitionInput = (
  patch: CustomerRequisition
): UpdateCustomerRequisitionInput => {
  return {
    comment: patch.comment,
    id: patch.id,
    otherPartyId: patch.otherPartyId,
    orderDate: patch.orderDate?.toISOString(),
    theirReference: patch.theirReference,
  };
};

const createUpdateCustomerRequisitionLineInput = (
  line: CustomerRequisitionLine
): UpdateCustomerRequisitionLineInput => {
  return {
    ...line,
  };
};

const createInsertCustomerRequisitionLineInput =
  (requisition: CustomerRequisition) =>
  (line: CustomerRequisitionLine): InsertCustomerRequisitionLineInput => {
    return {
      requisitionId: requisition.id,
      ...line,
    };
  };

const createDeleteCustomerRequisitionLineInput = (
  line: CustomerRequisitionLine
): DeleteCustomerRequisitionLineInput => {
  return {
    ...line,
  };
};

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getCustomerRequisitionDetailViewApi = (
  api: OmSupplyApi
): Api<Requisition, CustomerRequisition> => ({
  onRead: async (id: string): Promise<Requisition> => {
    const result = await api.requisition({ id });

    const requisition = requisitionGuard(result);
    const lines = linesGuard(requisition.lines);
    const otherParty = otherPartyGuard(requisition.otherParty);

    return {
      ...requisition,
      orderDate: requisition.orderDate ? new Date(requisition.orderDate) : null,
      requisitionDate: requisition.requisitionDate
        ? new Date(requisition.requisitionDate)
        : null,
      lines,
      otherParty,
      otherPartyName: otherParty.name,
    };
  },
  onUpdate: async (
    patch: CustomerRequisition
  ): Promise<CustomerRequisition> => {
    const deleteLines = patch.lines.filter(({ isDeleted }) => isDeleted);
    const insertLines = patch.lines.filter(
      ({ isCreated, isDeleted }) => !isDeleted && isCreated
    );
    const updateLines = patch.lines.filter(
      ({ isUpdated, isCreated, isDeleted }) =>
        isUpdated && !isCreated && !isDeleted
    );

    const result = await api.upsertCustomerRequisition({
      updateCustomerRequisitions: [createUpdateCustomerRequisitionInput(patch)],
      insertCustomerRequisitionLines: insertLines.map(
        createInsertCustomerRequisitionLineInput(patch)
      ),
      deleteCustomerRequisitionLines: deleteLines.map(
        createDeleteCustomerRequisitionLineInput
      ),
      updateCustomerRequisitionLines: updateLines.map(
        createUpdateCustomerRequisitionLineInput
      ),
    });

    const { batchCustomerRequisition } = result;

    if (
      batchCustomerRequisition.__typename === 'BatchCustomerRequisitionResponse'
    ) {
      const { updateCustomerRequisitions } = batchCustomerRequisition;
      if (
        updateCustomerRequisitions?.[0]?.__typename ===
        'UpdateCustomerRequisitionResponseWithId'
      ) {
        return patch;
      }
    }

    throw new Error('Could not update requisition');
  },
});
