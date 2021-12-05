import {
  ConnectorError,
  NameResponse,
  OmSupplyApi,
  RequisitionQuery,
  RequisitionLineConnector,
  UpdateSupplierRequisitionInput,
  UpdateSupplierRequisitionLineInput,
  InsertSupplierRequisitionLineInput,
  DeleteSupplierRequisitionLineInput,
} from '@openmsupply-client/common';
import {
  Requisition,
  SupplierRequisitionLine,
  SupplierRequisition,
} from './../../types';

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

const createUpdateSupplierRequisitionInput = (
  patch: SupplierRequisition
): UpdateSupplierRequisitionInput => {
  return {
    comment: patch.comment,
    id: patch.id,
    otherPartyId: patch.otherPartyId,
    orderDate: patch.orderDate?.toISOString(),
    theirReference: patch.theirReference,
  };
};

const createUpdateSupplierRequisitionLineInput = (
  line: SupplierRequisitionLine
): UpdateSupplierRequisitionLineInput => {
  return {
    ...line,
  };
};

const createInsertSupplierRequisitionLineInput =
  (requisition: SupplierRequisition) =>
  (line: SupplierRequisitionLine): InsertSupplierRequisitionLineInput => {
    return {
      requisitionId: requisition.id,
      ...line,
    };
  };

const createDeleteSupplierRequisitionLineInput = (
  line: SupplierRequisitionLine
): DeleteSupplierRequisitionLineInput => {
  return {
    ...line,
  };
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
    const lines = linesGuard(requisition.lines);
    const otherParty = otherPartyGuard(requisition.otherParty);

    return {
      ...requisition,
      lines,
      otherParty,
      orderDate: requisition.orderDate ? new Date(requisition.orderDate) : null,
      requisitionDate: requisition.requisitionDate
        ? new Date(requisition.requisitionDate)
        : null,
      otherPartyName: otherParty.name,
    };
  },
  onUpdate: async (
    patch: SupplierRequisition
  ): Promise<SupplierRequisition> => {
    const deleteLines = patch.lines.filter(({ isDeleted }) => isDeleted);
    const insertLines = patch.lines.filter(
      ({ isCreated, isDeleted }) => !isDeleted && isCreated
    );
    const updateLines = patch.lines.filter(
      ({ isUpdated, isCreated, isDeleted }) =>
        isUpdated && !isCreated && !isDeleted
    );

    const result = await api.upsertSupplierRequisition({
      updateSupplierRequisitions: [createUpdateSupplierRequisitionInput(patch)],
      insertSupplierRequisitionLines: insertLines.map(
        createInsertSupplierRequisitionLineInput(patch)
      ),
      deleteSupplierRequisitionLines: deleteLines.map(
        createDeleteSupplierRequisitionLineInput
      ),
      updateSupplierRequisitionLines: updateLines.map(
        createUpdateSupplierRequisitionLineInput
      ),
    });

    const { batchSupplierRequisition } = result;

    if (
      batchSupplierRequisition.__typename === 'BatchSupplierRequisitionResponse'
    ) {
      const { updateSupplierRequisitions } = batchSupplierRequisition;
      if (
        updateSupplierRequisitions?.[0]?.__typename ===
        'UpdateSupplierRequisitionResponseWithId'
      ) {
        return patch;
      }
    }

    throw new Error('Could not update requisition');
  },
});
