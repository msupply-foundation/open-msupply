import {
  UpdateRequestRequisitionLineInput,
  InsertRequestRequisitionLineInput,
  RequisitionNodeType,
  SortBy,
  RequisitionNodeStatus,
  UpdateRequestRequisitionInput,
  UpdateRequestRequisitionStatusInput,
  RequisitionSortFieldInput,
  InsertProgramRequestRequisitionInput,
  RequisitionFilterInput,
  UpdateIndicatorValueInput,
} from '@openmsupply-client/common';
import { DraftRequestLine } from './../DetailView/RequestLineEdit/hooks';
import { RequestRowFragment, Sdk } from './operations.generated';
import { RequestFragment, RequestLineFragment } from '.';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<RequestRowFragment>;
  filterBy?: RequisitionFilterInput | null;
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
      case 'orderType': {
        return RequisitionSortFieldInput.OrderType;
      }
      case 'period': {
        return RequisitionSortFieldInput.PeriodStartDate;
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
  toDelete: (line: RequestRowFragment) => {
    return { id: line.id };
  },
  toUpdate: (
    requisition: Partial<RequestFragment> & { id: string }
  ): UpdateRequestRequisitionInput => {
    return {
      id: requisition.id,
      otherPartyId: requisition.otherParty?.id,
      comment: requisition.comment,
      theirReference: requisition.theirReference,
      colour: requisition.colour,
      status: requestParser.toStatus(requisition),
      minMonthsOfStock: requisition.minMonthsOfStock,
      maxMonthsOfStock: requisition.maxMonthsOfStock,
    };
  },
  toDeleteLine: (line: RequestLineFragment) => ({ id: line.id }),
  toInsertLine: (
    line: DraftRequestLine
  ): InsertRequestRequisitionLineInput => ({
    id: line.id,
    itemId: line.itemId,
    requisitionId: line.requisitionId,
  }),
  toUpdateLine: (
    line: DraftRequestLine
  ): UpdateRequestRequisitionLineInput => ({
    id: line.id,
    requestedQuantity: line.requestedQuantity,
    comment: line.comment,
    optionId: line?.reason?.id ?? null,
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
        sort: sortBy
          ? {
              key: requestParser.toSortField(sortBy),
              desc: !!sortBy.isDesc,
            }
          : undefined,
        filter,
      });
      return result?.requisitions;
    },
    listAll: async ({ sortBy }: { sortBy: SortBy<RequestRowFragment> }) => {
      const filter = {
        type: { equalTo: RequisitionNodeType.Request },
      };
      const result = await sdk.requests({
        storeId,
        sort: {
          key: requestParser.toSortField(sortBy),
          desc: !!sortBy.isDesc,
        },
        filter,
      });
      return result?.requisitions;
    },
    byNumber: async (requisitionNumber: string): Promise<RequestFragment> => {
      const result = await sdk.requestByNumber({
        storeId,
        requisitionNumber: Number(requisitionNumber),
      });

      if (result?.requisitionByNumber.__typename === 'RequisitionNode') {
        return result?.requisitionByNumber;
      }

      throw new Error('Record not found');
    },
    byId: async (requisitionId: string): Promise<RequestFragment> => {
      const result = await sdk.requestById({
        storeId,
        requisitionId,
      });
      if (result?.requisition.__typename === 'RequisitionNode') {
        return result?.requisition;
      }

      throw new Error('Record not found');
    },
    lineChartData: async (requisitionLineId: string) => {
      const result = await sdk.requisitionLineChart({
        storeId,
        requisitionLineId,
      });

      if (result?.requisitionLineChart.__typename === 'ItemChartNode') {
        return result.requisitionLineChart;
      }

      throw new Error('Unable to load chart data');
    },
  },
  insertLine: async (input: InsertRequestRequisitionLineInput) => {
    const result = await sdk.insertRequestLine({
      storeId,
      input,
    });

    const { insertRequestRequisitionLine } = result || {};
    if (insertRequestRequisitionLine?.__typename === 'RequisitionLineNode') {
      return insertRequestRequisitionLine;
    }

    throw new Error('Unable to insert requisition line');
  },
  deleteLine: async (requestLineId: string) => {
    const ids = [{ id: requestLineId }];
    const result = await sdk.deleteRequestLines({ ids, storeId });

    if (result.batchRequestRequisition.deleteRequestRequisitionLines) {
      const failedLines =
        result.batchRequestRequisition.deleteRequestRequisitionLines.filter(
          line =>
            line.response.__typename === 'DeleteRequestRequisitionLineError'
        );
      if (failedLines.length === 0) {
        return result.batchRequestRequisition.deleteRequestRequisitionLines;
      }
    }

    throw new Error('Could not delete requisition lines!');
  },
  deleteLines: async (requestLines: RequestLineFragment[]) => {
    const ids = requestLines.map(requestParser.toDeleteLine);
    const result = await sdk.deleteRequestLines({ ids, storeId });

    if (result.batchRequestRequisition.deleteRequestRequisitionLines) {
      const failedLines =
        result.batchRequestRequisition.deleteRequestRequisitionLines.filter(
          line =>
            line.response.__typename === 'DeleteRequestRequisitionLineError'
        );
      if (failedLines.length === 0) {
        return result.batchRequestRequisition.deleteRequestRequisitionLines;
      }
    }

    throw new Error('Could not delete requisition lines!');
  },
  upsertLine: async (draftLine: DraftRequestLine) => {
    let result;
    if (draftLine.isCreated) {
      const input = requestParser.toInsertLine(draftLine);
      result = await sdk.insertRequestLine({
        storeId,
        input,
      });

      const { insertRequestRequisitionLine } = result || {};
      if (insertRequestRequisitionLine?.__typename === 'RequisitionLineNode') {
        return insertRequestRequisitionLine;
      }
    } else {
      const input = requestParser.toUpdateLine(draftLine);
      result = await sdk.updateRequestLine({
        storeId,
        input,
      });

      return result.updateRequestRequisitionLine;
    }

    throw new Error('Unable to update requisition');
  },
  update: async (
    patch: Omit<Partial<RequestFragment | RequestRowFragment>, 'lines'> & {
      id: string;
    }
  ) => {
    const input = requestParser.toUpdate(patch);
    const result = await sdk.updateRequest({
      storeId,
      input,
    });

    const { updateRequestRequisition } = result || {};

    return updateRequestRequisition;
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
  }> => {
    const result = await sdk.insertRequest({
      storeId,
      input: {
        id,
        otherPartyId,
        maxMonthsOfStock: 1,
        minMonthsOfStock: 0,
      },
    });

    const { insertRequestRequisition } = result || {};

    if (insertRequestRequisition?.__typename === 'RequisitionNode') {
      return insertRequestRequisition;
    }

    throw new Error('Unable to create requisition');
  },
  insertProgram: async (input: InsertProgramRequestRequisitionInput) => {
    const result = await sdk.insertProgramRequest({
      storeId,
      input,
    });

    return result.insertProgramRequestRequisition;
  },
  deleteRequests: async (requisitions: RequestRowFragment[]) => {
    const deleteRequestRequisitions = requisitions.map(requestParser.toDelete);
    const result = await sdk.deleteRequest({
      storeId,
      input: { deleteRequestRequisitions },
    });

    const { batchRequestRequisition } = result || {};

    if (batchRequestRequisition?.deleteRequestRequisitions) {
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
  useSuggestedQuantity: async (requestId: string) => {
    const result = await sdk.useSuggestedQuantity({ requestId, storeId });
    return result;
  },
  programSettings: async () => {
    const result = await sdk.supplierProgramSettings({ storeId });
    return result.supplierProgramRequisitionSettings;
  },
  getIndicators: async (
    customerNameId: string,
    periodId: string,
    programId: string
  ) => {
    const result = await sdk.programIndicators({
      storeId,
      customerNameId,
      periodId,
      programId,
    });

    if (result?.programIndicators.__typename === 'ProgramIndicatorConnector') {
      return result.programIndicators;
    }
  },
  updateIndicatorValue: async (patch: UpdateIndicatorValueInput) => {
    const result = await sdk.updateIndicatorValue({ storeId, input: patch });

    if (!!result?.updateIndicatorValue) {
      return result.updateIndicatorValue;
    }

    throw new Error('Could not update indicator value');
  },
});
