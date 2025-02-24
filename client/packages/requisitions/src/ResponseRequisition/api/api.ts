import {
  RequisitionNodeStatus,
  SortBy,
  FilterByWithBoolean,
  RequisitionSortFieldInput,
  RequisitionNodeType,
  UpdateResponseRequisitionInput,
  UpdateResponseRequisitionStatusInput,
  UpdateResponseRequisitionLineInput,
  InsertProgramResponseRequisitionInput,
  InsertResponseRequisitionLineInput,
  UpdateIndicatorValueInput,
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
  deleteLines: async (responseLines: ResponseLineFragment[]) => {
    const ids = responseLines.map(responseParser.toDeleteLine);
    const result = await sdk.deleteResponseLines({ ids, storeId });

    if (result?.batchResponseRequisition.deleteResponseRequisitionLines) {
      return result.batchResponseRequisition.deleteResponseRequisitionLines;
    }

    throw new Error('Could not delete lines');
  },
  insertLine: async (input: InsertResponseRequisitionLineInput) => {
    const result =
      (await sdk.insertResponseLine({
        storeId,
        input,
      })) || {};

    if (
      result?.insertResponseRequisitionLine.__typename === 'RequisitionLineNode'
    ) {
      return result.insertResponseRequisitionLine;
    } else throw new Error('Could not insert response');
  },
  updateLine: async (patch: DraftResponseLine) => {
    const result =
      (await sdk.updateResponseLine({
        storeId,
        input: responseParser.toUpdateLine(patch),
      })) || {};

    return result;
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
  programSettings: async () => {
    const result = await sdk.customerProgramSettings({ storeId });
    return result.customerProgramRequisitionSettings;
  },
  getIndicators: async (
    customerNameId: string,
    periodId: string,
    programId: string
  ) => {
    let result = await sdk.programIndicators({
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
    let result = await sdk.updateIndicatorValue({ storeId, input: patch });

    if (!!result?.updateIndicatorValue) {
      return result.updateIndicatorValue;
    }

    throw new Error('Could not update indicator value');
  },
});
