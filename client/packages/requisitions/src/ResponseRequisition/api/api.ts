import {
  RequisitionNodeStatus,
  SortBy,
  FilterBy,
  RequisitionSortFieldInput,
  RequisitionNodeType,
  UpdateResponseRequisitionInput,
  UpdateResponseRequisitionStatusInput,
  UpdateResponseRequisitionLineInput,
  InsertProgramResponseRequisitionInput,
  UpdateIndicatorValueInput,
  InsertResponseRequisitionLineInput,
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
  first?: number;
  offset?: number;
  sortBy?: SortBy<ResponseRowFragment>;
  filterBy: FilterBy | null;
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
    sortBy?: SortBy<ResponseRowFragment>
  ): RequisitionSortFieldInput => {
    switch (sortBy?.key) {
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
  toInsertLine: (
    line: DraftResponseLine
  ): InsertResponseRequisitionLineInput => ({
    id: line.id,
    requisitionId: line.requisitionId,
    itemId: line.itemId,
  }),
  toUpdateLine: (
    patch: DraftResponseLine
  ): UpdateResponseRequisitionLineInput => ({
    id: patch.id,
    supplyQuantity: patch.supplyQuantity,
    comment: patch.comment,
    stockOnHand: patch.availableStockOnHand,
    initialStockOnHand: patch.initialStockOnHandUnits,
    additionInUnits: patch.additionInUnits,
    averageMonthlyConsumption: patch.averageMonthlyConsumption,
    daysOutOfStock: patch.daysOutOfStock,
    expiringUnits: patch.expiringUnits,
    incomingUnits: patch.incomingUnits,
    lossInUnits: patch.lossInUnits,
    outgoingUnits: patch.outgoingUnits,
    requestedQuantity: patch.requestedQuantity,
    optionId: patch?.reason?.id ?? null,
  }),
};

export const getResponseQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({ first, offset, sortBy, filterBy }: ListParams) => {
      const s = sortBy || {
        key: 'createdDatetime',
        direction: 'desc',
        isDesc: true,
      };
      const result = await sdk.responses({
        storeId,
        page: { offset, first },
        sort: {
          key: responseParser.toSortField(s),
          desc: !!s?.isDesc,
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
    byId: async (requisitionId: string): Promise<ResponseFragment> => {
      const result = await sdk.responseById({
        storeId,
        requisitionId: requisitionId,
      });

      if (result?.requisition.__typename === 'RequisitionNode') {
        return result?.requisition;
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
  }): Promise<string> => {
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
      return insertResponseRequisition.id;
    }

    throw new Error('Unable to create requisition');
  },
  insertRequestFromResponse: async ({
    id,
    responseRequisitionId,
    otherPartyId,
    comment,
  }: {
    id: string;
    responseRequisitionId: string;
    otherPartyId: string;
    comment?: string;
  }): Promise<string> => {
    const result = await sdk.insertRequestFromResponseRequisition({
      storeId,
      input: {
        id,
        responseRequisitionId,
        otherPartyId,
        comment,
      },
    });

    const { insertFromResponseRequisition } = result || {};

    if (insertFromResponseRequisition?.__typename === 'RequisitionNode') {
      return insertFromResponseRequisition.id;
    }

    throw new Error('Unable to create request from response requisition');
  },

  insertProgram: async (input: InsertProgramResponseRequisitionInput) => {
    const result = await sdk.insertProgramResponse({
      storeId,
      input,
    });

    return result.insertProgramResponseRequisition;
  },
  update: async (patch: Partial<ResponseFragment> & { id: string }) => {
    const input = responseParser.toUpdate(patch);
    const result = (await sdk.updateResponse({ storeId, input })) || {};

    return result.updateResponseRequisition;
  },
  deleteResponses: async (requisitions: ResponseFragment[]) => {
    const deleteResponseRequisitions = requisitions.map(
      responseParser.toDelete
    );
    const result = await sdk.deleteResponse({
      storeId,
      input: { deleteResponseRequisitions },
    });

    const { batchResponseRequisition } = result || {};

    if (batchResponseRequisition?.deleteResponseRequisitions) {
      return batchResponseRequisition.deleteResponseRequisitions;
    }

    throw new Error('Could not delete requisitions');
  },
  upsertLine: async (draftLine: DraftResponseLine) => {
    let result;
    if (draftLine.isCreated) {
      const input = responseParser.toInsertLine(draftLine);
      result = await sdk.insertResponseLine({
        storeId,
        input,
      });

      const { insertResponseRequisitionLine } = result || {};
      if (insertResponseRequisitionLine?.__typename === 'RequisitionLineNode') {
        return insertResponseRequisitionLine;
      }
    } else {
      const input = responseParser.toUpdateLine(draftLine);
      result = await sdk.updateResponseLine({
        storeId,
        input,
      });

      return result?.updateResponseRequisitionLine;
    }

    throw new Error('Unable to update requisition');
  },
  deleteLine: async (responseLineId: string) => {
    const ids = [{ id: responseLineId }];
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
  deleteLines: async (responseLines: ResponseLineFragment[]) => {
    const ids = responseLines.map(responseParser.toDeleteLine);
    const result = await sdk.deleteResponseLines({ ids, storeId });

    if (result?.batchResponseRequisition.deleteResponseRequisitionLines) {
      return result.batchResponseRequisition.deleteResponseRequisitionLines;
    }

    throw new Error('Could not delete lines');
  },
  createOutboundFromResponse: async (responseId: string): Promise<string> => {
    const result =
      (await sdk.createOutboundFromResponse({
        storeId,
        responseId,
      })) || {};

    if (result?.createRequisitionShipment.__typename === 'InvoiceNode') {
      return result.createRequisitionShipment.id;
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

  programRequisitionSettingsByCustomer: async (customerNameId: string) => {
    const result = await sdk.programRequisitionSettingsByCustomer({
      storeId,
      customerNameId,
    });
    return result.programRequisitionSettingsByCustomer;
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

  responseAddFromMasterList: async ({
    responseId,
    masterListId,
  }: {
    responseId: string;
    masterListId: string;
  }) => {
    const result = await sdk.responseAddFromMasterList({
      storeId,
      responseId,
      masterListId,
    });

    if (
      result.responseAddFromMasterList.__typename === 'RequisitionLineConnector'
    ) {
      return result.responseAddFromMasterList;
    }

    if (
      result.responseAddFromMasterList.__typename ===
      'ResponseAddFromMasterListError'
    ) {
      throw new Error(result.responseAddFromMasterList.error.__typename);
    }

    throw new Error('Could not add from master list');
  },
  hasCustomerProgramRequisitionSettings: async (
    customerNameIds: string[]
  ): Promise<boolean> => {
    const result = await sdk.hasCustomerProgramRequisitionSettings({
      storeId,
      customerNameIds,
    });

    return result.hasCustomerProgramRequisitionSettings;
  },
});
