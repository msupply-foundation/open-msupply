import {
  RequisitionNodeType,
  FilterBy,
  SortBy,
  RequisitionNodeStatus,
  UpdateRequestRequisitionInput,
  UpdateRequestRequisitionStatusInput,
  RequisitionSortFieldInput,
} from '@openmsupply-client/common';
import { DraftRequestRequisitionLine } from './../DetailView/RequestLineEdit/hooks';
import {
  RequestRequisitionRowFragment,
  getSdk,
  RequestRequisitionFragment,
  Sdk,
} from './operations.generated';

export type RequestRequisitionApi = ReturnType<typeof getSdk>;

const requestParser = {
  toStatus: (
    patch: Partial<RequestRequisitionFragment> & { id: string }
  ): UpdateRequestRequisitionStatusInput | undefined => {
    switch (patch.status) {
      case RequisitionNodeStatus.Sent:
        return UpdateRequestRequisitionStatusInput.Sent;
      default:
        return undefined;
    }
  },
  toSortField: (
    sortBy: SortBy<RequestRequisitionRowFragment>
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
  toDelete: (line: RequestRequisitionRowFragment) => {
    return { id: line.id };
  },
  toUpdate: (
    requisition: Partial<RequestRequisitionFragment> & { id: string }
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
  toInsertLine: (line: DraftRequestRequisitionLine) => ({
    id: line.id,
    itemId: line.itemId,
    requisitionId: line.requisitionId,
    requestedQuantity: line.requestedQuantity,
  }),
  toUpdateLine: (line: DraftRequestRequisitionLine) => ({
    id: line.id,
    requestedQuantity: line.requestedQuantity,
  }),
};

export const getRequestQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<RequestRequisitionRowFragment>;
      filterBy: FilterBy | null;
    }) => {
      const filter = {
        ...filterBy,
        type: { equalTo: RequisitionNodeType.Request },
      };
      const result = await sdk.requestRequisitions({
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
    byNumber: async (
      requisitionNumber: string
    ): Promise<RequestRequisitionFragment> => {
      const result = await sdk.requestRequisition({
        storeId,
        requisitionNumber: Number(requisitionNumber),
      });

      if (result.requisitionByNumber.__typename === 'RequisitionNode') {
        return result.requisitionByNumber;
      }

      throw new Error('Record not found');
    },
  },
  upsertLine: async (draftLine: DraftRequestRequisitionLine) => {
    let result;
    if (draftLine.isCreated) {
      const input = requestParser.toInsertLine(draftLine);
      result = await sdk.insertRequestRequisitionLine({
        storeId,
        input,
      });

      const { insertRequestRequisitionLine } = result;
      if (insertRequestRequisitionLine.__typename === 'RequisitionLineNode') {
        return insertRequestRequisitionLine;
      }
    } else {
      const input = requestParser.toUpdateLine(draftLine);
      result = await sdk.updateRequestRequisitionLine({
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
  update: async (
    patch: Partial<RequestRequisitionFragment> & { id: string }
  ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
    const input = requestParser.toUpdate(patch);
    const result = await sdk.updateRequestRequisition({
      storeId,
      input,
    });

    const { updateRequestRequisition } = result;

    if (updateRequestRequisition.__typename === 'RequisitionNode') {
      return updateRequestRequisition;
    }

    throw new Error('Unable to update requisition');
  },
  create: async ({
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
    const result = await sdk.insertRequestRequisition({
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
  deleteRequisitions: async (requisitions: RequestRequisitionRowFragment[]) => {
    const promises = requisitions.map(requisition => {
      const input = requestParser.toDelete(requisition);
      return sdk.deleteRequestRequisition({ input, storeId });
    });
    const results = await Promise.all(promises);

    const success = results.every(({ deleteRequestRequisition }) => {
      return deleteRequestRequisition.__typename === 'DeleteResponse';
    });

    if (success) return results;

    throw new Error('Could not delete requisition');
  },
});
