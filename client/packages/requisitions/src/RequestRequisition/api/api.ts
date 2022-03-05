import {
  UpdateRequestRequisitionLineInput,
  InsertRequestRequisitionLineInput,
  RequisitionNodeType,
  FilterBy,
  SortBy,
  RequisitionNodeStatus,
  UpdateRequestRequisitionInput,
  UpdateRequestRequisitionStatusInput,
  RequisitionSortFieldInput,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './../DetailView/RequestLineEdit/hooks';
import {
  RequestRowFragment,
  RequestFragment,
  Sdk,
} from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<RequestRowFragment>;
  filterBy: FilterBy | null;
};

const requestParser = {
  toStatus: (
    patch: Partial<RequestFragment> & { id: string }
  ): UpdateRequestRequisitionStatusInput | undefined => {
    switch (patch.status) {
      case RequisitionNodeStatus.Sent:
        return UpdateRequestRequisitionStatusInput.Sent;
      default:
        return undefined;
    }
  },
  toSortField: (
    sortBy: SortBy<RequestRowFragment>
  ): RequisitionSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return RequisitionSortFieldInput.CreatedDatetime;
      }
      case 'otherPartyName': {
        return RequisitionSortFieldInput.OtherPartyName;
      }
      case 'requisitionNumber': {
        return RequisitionSortFieldInput.RequisitionNumber;
      }
      case 'status': {
        return RequisitionSortFieldInput.Status;
      }

      case 'sentDatetime':
      case 'finalisedDatetime':
      case 'comment':
      default: {
        return RequisitionSortFieldInput.CreatedDatetime;
      }
    }
  },
  toDelete: (line: RequestRowFragment) => {
    return { id: line.id };
  },
  toUpdate: (
    requisition: Partial<RequestFragment> & { id: string }
  ): UpdateRequestRequisitionInput => {
    return {
      id: requisition.id,
      // otherPartyId: requisition.otherParty?.id,
      comment: requisition.comment,
      theirReference: requisition.theirReference,
      colour: requisition.colour,
      status: requestParser.toStatus(requisition),
    };
  },
  toInsertLine: (
    line: DraftRequestLine
  ): InsertRequestRequisitionLineInput => ({
    id: line.id,
    itemId: line.itemId,
    requisitionId: line.requisitionId,
    requestedQuantity: line.requestedQuantity,
    comment: line.comment,
  }),
  toUpdateLine: (
    line: DraftRequestLine
  ): UpdateRequestRequisitionLineInput => ({
    id: line.id,
    requestedQuantity: line.requestedQuantity,
    comment: line.comment,
  }),
};

export const getRequestQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ first, offset, sortBy, filterBy }: ListParams) => {
      const filter = {
        ...filterBy,
        type: { equalTo: RequisitionNodeType.Request },
      };
      const result = await sdk.requests({
        storeId,
        page: { offset, first },
        sort: {
          key: requestParser.toSortField(sortBy),
          desc: !!sortBy.isDesc,
        },
        filter,
      });
      return result.requisitions;
    },
    byNumber: async (requisitionNumber: string): Promise<RequestFragment> => {
      const result = await sdk.requestByNumber({
        storeId,
        requisitionNumber: Number(requisitionNumber),
      });

      if (result.requisitionByNumber.__typename === 'RequisitionNode') {
        return result.requisitionByNumber;
      }

      throw new Error('Record not found');
    },
  },
  upsertLine: async (draftLine: DraftRequestLine) => {
    let result;
    if (draftLine.isCreated) {
      const input = requestParser.toInsertLine(draftLine);
      result = await sdk.insertRequestLine({
        storeId,
        input,
      });

      const { insertRequestRequisitionLine } = result;
      if (insertRequestRequisitionLine.__typename === 'RequisitionLineNode') {
        return insertRequestRequisitionLine;
      }
    } else {
      const input = requestParser.toUpdateLine(draftLine);
      result = await sdk.updateRequestLine({
        storeId,
        input,
      });

      const { updateRequestRequisitionLine } = result;
      if (updateRequestRequisitionLine.__typename === 'RequisitionLineNode') {
        return updateRequestRequisitionLine;
      }
    }

    throw new Error('Unable to update requisition');
  },
  update: async (patch: Partial<RequestFragment> & { id: string }) => {
    const input = requestParser.toUpdate(patch);
    const result = await sdk.updateRequest({
      storeId,
      input,
    });

    const { updateRequestRequisition } = result;

    if (updateRequestRequisition.__typename === 'RequisitionNode') {
      return updateRequestRequisition;
    }

    throw new Error('Unable to update requisition');
  },
  insert: async ({
    id,
    otherPartyId,
  }: {
    id: string;
    otherPartyId: string;
  }): Promise<{
    __typename: 'RequisitionNode';
    id: string;
    requisitionNumber: number;
  }> => {
    const result = await sdk.insertRequest({
      storeId,
      input: {
        id,
        otherPartyId,
        maxMonthsOfStock: 1,
        minMonthsOfStock: 1,
      },
    });

    const { insertRequestRequisition } = result;

    if (insertRequestRequisition.__typename === 'RequisitionNode') {
      return insertRequestRequisition;
    }

    throw new Error('Unable to create requisition');
  },
  deleteRequests: async (requisitions: RequestRowFragment[]) => {
    const deleteRequestRequisitions = requisitions.map(requestParser.toDelete);
    const result = await sdk.deleteRequest({
      storeId,
      input: { deleteRequestRequisitions },
    });

    const { batchRequestRequisition } = result;

    if (batchRequestRequisition.deleteRequestRequisitions) {
      console.log(batchRequestRequisition.deleteRequestRequisitions.length);
      return batchRequestRequisition.deleteRequestRequisitions.length;
    }

    throw new Error('Could not delete requisitions');
  },

  addFromMasterList: async ({
    requestId,
    masterListId,
  }: {
    requestId: string;
    masterListId: string;
  }) => {
    const result = await sdk.addFromMasterList({
      requestId,
      masterListId,
      storeId,
    });

    if (result.addFromMasterList.__typename === 'RequisitionLineConnector') {
      return result.addFromMasterList;
    }

    if (result.addFromMasterList.__typename === 'AddFromMasterListError') {
      throw new Error(result.addFromMasterList.error.__typename);
    }

    throw new Error('Could not add from master list');
  },
});
