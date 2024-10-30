import {
  RequisitionNodeStatus,
  SortBy,
  FilterByWithBoolean,
  RequisitionSortFieldInput,
  RequisitionNodeType,
  UpdateResponseRequisitionInput,
  UpdateResponseRequisitionStatusInput,
  UpdateResponseRequisitionLineInput,
} from '@openmsupply-client/common';
import {
  ResponseFragment,
  ResponseLineFragment,
  ResponseRowFragment,
  Sdk,
  SupplyRequestedQuantityMutation,
} from './operations.generated';
import { DraftResponseLine } from './../DetailView/ResponseLineEdit/hooks';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<ResponseRowFragment>;
  filterBy: FilterByWithBoolean | null;
};

const responseParser = {
  toStatus: (
    patch: Partial<ResponseFragment> & { id: string }
  ): UpdateResponseRequisitionStatusInput | undefined => {
    switch (patch.status) {
      case RequisitionNodeStatus.Finalised:
        return UpdateResponseRequisitionStatusInput.Finalised;
      default:
        return undefined;
    }
  },
  toSortField: (
    sortBy: SortBy<ResponseRowFragment>
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
      case 'orderType': {
        return RequisitionSortFieldInput.OrderType;
      }
      case 'period': {
        return RequisitionSortFieldInput.PeriodName;
      }
      case 'programName': {
        return RequisitionSortFieldInput.ProgramName;
      }

      case 'sentDatetime':
      case 'finalisedDatetime':
      case 'comment':
      default: {
        return RequisitionSortFieldInput.CreatedDatetime;
      }
    }
  },
  toUpdate: (
    requisition: Partial<ResponseFragment> & { id: string }
  ): UpdateResponseRequisitionInput => {
    return {
      id: requisition.id,
      comment: requisition.comment,
      theirReference: requisition.theirReference,
      colour: requisition.colour,
      status: responseParser.toStatus(requisition),
    };
  },
  toDelete: (line: ResponseFragment) => {
    return { id: line.id };
  },
  toDeleteLine: (line: ResponseLineFragment) => ({ id: line.id }),
  toUpdateLine: (
    patch: DraftResponseLine
  ): UpdateResponseRequisitionLineInput => ({
    id: patch.id,
    supplyQuantity: patch.supplyQuantity,
    comment: patch.comment,
  }),
};

export const getResponseQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ first, offset, sortBy, filterBy }: ListParams) => {
      const result = await sdk.responses({
        storeId,
        page: { offset, first },
        sort: {
          key: responseParser.toSortField(sortBy),
          desc: !!sortBy.isDesc,
        },
        filter: {
          ...filterBy,
          type: { equalTo: RequisitionNodeType.Response },
        },
      });
      return result?.requisitions;
    },
    listAll: async ({ sortBy }: { sortBy: SortBy<ResponseRowFragment> }) => {
      const result = await sdk.responses({
        storeId,
        sort: {
          key: responseParser.toSortField(sortBy),
          desc: !!sortBy.isDesc,
        },
        filter: {
          type: { equalTo: RequisitionNodeType.Response },
        },
      });
      return result?.requisitions;
    },
    byNumber: async (requisitionNumber: string): Promise<ResponseFragment> => {
      const result = await sdk.responseByNumber({
        storeId,
        requisitionNumber: Number(requisitionNumber),
      });

      if (result?.requisitionByNumber.__typename === 'RequisitionNode') {
        return result?.requisitionByNumber;
      }

      throw new Error('Record not found');
    },
    stats: async (requisitionLineId: string) => {
      const result = await sdk.responseRequisitionStats({
        requisitionLineId,
        storeId,
      });

      if (
        result?.responseRequisitionStats.__typename ===
        'ResponseRequisitionStatsNode'
      ) {
        return result.responseRequisitionStats;
      }

      throw new Error('Unable to load chart data');
    },
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
    const result = await sdk.insertResponse({
      storeId,
      input: {
        id,
        otherPartyId,
        maxMonthsOfStock: 1,
        minMonthsOfStock: 0,
      },
    });

    const { insertResponseRequisition } = result || {};

    if (insertResponseRequisition?.__typename === 'RequisitionNode') {
      return insertResponseRequisition;
    }

    throw new Error('Unable to create requisition');
  },
  update: async (
    patch: Partial<ResponseFragment> & { id: string }
  ): Promise<{ __typename: 'RequisitionNode'; id: string }> => {
    const input = responseParser.toUpdate(patch);
    const result = (await sdk.updateResponse({ storeId, input })) || {};

    const { updateResponseRequisition } = result;

    if (updateResponseRequisition?.__typename === 'RequisitionNode') {
      return updateResponseRequisition;
    }

    throw new Error('Unable to update requisition');
  },
  deleteResponses: async (requisitions: ResponseFragment[]) => {
    const deleteResponseRequisitions = requisitions.map(
      responseParser.toDelete
    );
    const result = await sdk.deleteRequest({
      storeId,
      input: { deleteResponseRequisitions },
    });

    const { batchResponseRequisition } = result || {};

    if (batchResponseRequisition?.deleteResponseRequisitions) {
      return batchResponseRequisition.deleteResponseRequisitions.length;
    }

    throw new Error('Could not delete requisitions');
  },
  deleteLines: async (responseLines: ResponseLineFragment[]) => {
    const ids = responseLines.map(responseParser.toDeleteLine);
    const result = await sdk.deleteResponseLines({ ids, storeId });

    if (result.batchResponseRequisition.deleteResponseRequisitionLines) {
      const failedLines =
        result.batchResponseRequisition.deleteResponseRequisitionLines.filter(
          line =>
            line.response.__typename === 'DeleteResponseRequisitionLineError'
        );
      if (failedLines.length === 0) {
        return result.batchResponseRequisition.deleteResponseRequisitionLines;
      }
    }

    throw new Error('Could not delete requisition lines!');
  },
  updateLine: async (patch: DraftResponseLine) => {
    const result =
      (await sdk.updateResponseLine({
        storeId,
        input: responseParser.toUpdateLine(patch),
      })) || {};

    if (
      result?.updateResponseRequisitionLine.__typename === 'RequisitionLineNode'
    ) {
      return result.updateResponseRequisitionLine;
    } else throw new Error('Could not update response line');
  },
  createOutboundFromResponse: async (responseId: string): Promise<number> => {
    const result =
      (await sdk.createOutboundFromResponse({
        storeId,
        responseId,
      })) || {};

    if (result?.createRequisitionShipment.__typename === 'InvoiceNode') {
      return result.createRequisitionShipment.invoiceNumber;
    }

    if (
      result?.createRequisitionShipment.__typename ===
      'CreateRequisitionShipmentError'
    ) {
      throw new Error(result.createRequisitionShipment.error.__typename);
    }

    throw new Error('Could not create outbound');
  },
  supplyRequestedQuantity: async (
    responseId: string
  ): Promise<SupplyRequestedQuantityMutation> => {
    const result =
      (await sdk.supplyRequestedQuantity({ storeId, responseId })) || {};
    return result;
  },
});
