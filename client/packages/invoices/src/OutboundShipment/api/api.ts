import {
  InvoiceNodeType,
  FilterBy,
  SortBy,
  UpdateOutboundShipmentUnallocatedLineInput,
  InsertOutboundShipmentUnallocatedLineInput,
  DeleteOutboundShipmentLineInput,
  RecordPatch,
  UpdateOutboundShipmentInput,
  InvoiceNodeStatus,
  UpdateOutboundShipmentStatusInput,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
  InvoiceLineNodeType,
  InvoiceSortFieldInput,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../types';
import { get, isA } from '../../utils';
import {
  OutboundRowFragment,
  OutboundFragment,
  InsertOutboundShipmentMutationVariables,
  Sdk,
  OutboundLineFragment,
} from './operations.generated';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<OutboundRowFragment>;
  filterBy: FilterBy | null;
};

const outboundParsers = {
  toSortField: (sortBy: SortBy<OutboundRowFragment>): InvoiceSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return InvoiceSortFieldInput.CreatedDatetime;
      }
      case 'otherPartyName': {
        return InvoiceSortFieldInput.OtherPartyName;
      }
      case 'comment': {
        return InvoiceSortFieldInput.Comment;
      }
      case 'invoiceNumber': {
        return InvoiceSortFieldInput.InvoiceNumber;
      }
      case 'status':
      default: {
        return InvoiceSortFieldInput.Status;
      }
    }
  },
  toStatus: (patch: RecordPatch<OutboundRowFragment>) => {
    switch (patch.status) {
      case InvoiceNodeStatus.Allocated:
        return UpdateOutboundShipmentStatusInput.Allocated;
      case InvoiceNodeStatus.Picked:
        return UpdateOutboundShipmentStatusInput.Picked;
      case InvoiceNodeStatus.Shipped:
        return UpdateOutboundShipmentStatusInput.Shipped;
      default:
        return undefined;
    }
  },
  toInsert: (
    patch: Omit<InsertOutboundShipmentMutationVariables, 'storeId'>,
    storeId: string
  ): InsertOutboundShipmentMutationVariables => ({
    id: patch.id,
    otherPartyId: patch.otherPartyId,
    storeId,
  }),
  toUpdate: (
    patch: RecordPatch<OutboundRowFragment> | RecordPatch<OutboundFragment>
  ): UpdateOutboundShipmentInput => ({
    id: patch.id,
    colour: patch.colour,
    comment: patch.comment,
    status: outboundParsers.toStatus(patch),
    onHold: 'onHold' in patch ? patch.onHold : undefined,
    otherPartyId: 'otherParty' in patch ? patch.otherParty?.id : undefined,
    theirReference: patch.theirReference,
    transportReference: patch.transportReference,
  }),
  toInsertLine: (line: DraftOutboundLine): InsertOutboundShipmentLineInput => {
    return {
      id: line.id,
      itemId: line.item.id,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLine?.id ?? '',
      invoiceId: line.invoiceId,
      tax: { percentage: 0 },
      totalBeforeTax: get.stockLineSubtotal(line),
      totalAfterTax: get.stockLineTotal(line),
    };
  },
  toUpdateLine: (line: DraftOutboundLine): UpdateOutboundShipmentLineInput => {
    return {
      id: line.id,
      invoiceId: line.invoiceId,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLine?.id ?? '',
      tax: { percentage: line.taxPercentage },
      totalBeforeTax: get.stockLineSubtotal(line),
      totalAfterTax: get.stockLineTotal(line),
    };
  },
  toDeleteLine: (line: {
    id: string;
    invoiceId: string;
  }): DeleteOutboundShipmentLineInput => ({
    id: line.id,
    invoiceId: line.invoiceId,
  }),
  toInsertPlaceholder: (
    line: DraftOutboundLine
  ): InsertOutboundShipmentUnallocatedLineInput => ({
    id: line.id,
    quantity: line.numberOfPacks,
    invoiceId: line.invoiceId,
    itemId: line.item.id,
  }),
  toUpdatePlaceholder: (
    line: DraftOutboundLine
  ): UpdateOutboundShipmentUnallocatedLineInput => ({
    id: line.id,
    quantity: line.numberOfPacks,
  }),
  toDeletePlaceholder: (line: DraftOutboundLine) => ({
    id: line.id,
  }),
  toInsertServiceCharge: (line: DraftOutboundLine) => ({
    id: line.id,
    invoiceId: line.invoiceId,
    itemId: line.item.id,
    tax: { percentage: line.taxPercentage },
    totalBeforeTax: line.totalBeforeTax,
    totalAfterTax: get.serviceChargeTotal(line),
    note: line.note,
  }),
  toUpdateServiceCharge: (line: DraftOutboundLine) => ({
    id: line.id,
    invoiceId: line.invoiceId,
    itemId: line.item.id,
    tax: { percentage: line.taxPercentage },
    totalBeforeTax: line.totalBeforeTax,
    totalAfterTax: get.serviceChargeTotal(line),
    note: line.note,
  }),
  toDeleteServiceCharge: (line: DraftOutboundLine) => ({
    id: line.id,
    invoiceId: line.invoiceId,
  }),
};

export const getOutboundQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams): Promise<{
      nodes: OutboundRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.OutboundShipment },
      };
      const result = await sdk.invoices({
        first,
        offset,
        key: outboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result.invoices;
    },
    listAll: async ({
      sortBy,
    }: {
      sortBy: SortBy<OutboundRowFragment>;
    }): Promise<{
      nodes: OutboundRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        type: { equalTo: InvoiceNodeType.OutboundShipment },
      };
      const result = await sdk.invoices({
        key: outboundParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result.invoices;
    },
    byId: async (id: string): Promise<OutboundFragment> => {
      const result = await sdk.invoice({ id, storeId });
      const invoice = result.invoice;

      if (invoice.__typename === 'InvoiceNode') {
        return invoice;
      } else {
        throw new Error('Could not find invoice');
      }
    },
    byNumber: async (invoiceNumber: string): Promise<OutboundFragment> => {
      const result = await sdk.outboundByNumber({
        invoiceNumber: Number(invoiceNumber),
        storeId,
      });
      const invoice = result.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        return invoice;
      } else {
        throw new Error('Could not find invoice');
      }
    },
  },
  insert: async (
    invoice: Omit<InsertOutboundShipmentMutationVariables, 'storeId'>
  ): Promise<number> => {
    const result =
      (await sdk.insertOutboundShipment({
        id: invoice.id,
        otherPartyId: invoice.otherPartyId,
        storeId,
      })) || {};

    const { insertOutboundShipment } = result;

    if (insertOutboundShipment?.__typename === 'InvoiceNode') {
      return insertOutboundShipment.invoiceNumber;
    }

    throw new Error('Could not insert invoice');
  },
  delete: async (invoices: OutboundRowFragment[]): Promise<string[]> => {
    const result =
      (await sdk.deleteOutboundShipments({
        storeId,
        deleteOutboundShipments: invoices.map(invoice => invoice.id),
      })) || {};

    const { batchOutboundShipment } = result;
    if (batchOutboundShipment?.deleteOutboundShipments) {
      return batchOutboundShipment.deleteOutboundShipments.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  },
  update: async (
    patch: RecordPatch<OutboundRowFragment> | RecordPatch<OutboundFragment>
  ) => {
    const result =
      (await sdk.upsertOutboundShipment({
        storeId,
        input: {
          updateOutboundShipments: [outboundParsers.toUpdate(patch)],
        },
      })) || {};

    const { batchOutboundShipment } = result;

    if (batchOutboundShipment?.__typename === 'BatchOutboundShipmentResponse') {
      return patch;
    }

    throw new Error('Unable to update invoice');
  },
  updateLines: async (draftOutboundLines: DraftOutboundLine[]) => {
    const input = {
      insertOutboundShipmentLines: draftOutboundLines
        .filter(
          ({ type, isCreated, numberOfPacks }) =>
            isCreated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks > 0
        )
        .map(outboundParsers.toInsertLine),
      updateOutboundShipmentLines: draftOutboundLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks > 0
        )
        .map(outboundParsers.toUpdateLine),
      deleteOutboundShipmentLines: draftOutboundLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks === 0
        )
        .map(outboundParsers.toDeleteLine),
      insertOutboundShipmentUnallocatedLines: draftOutboundLines
        .filter(
          ({ type, isCreated, numberOfPacks }) =>
            type === InvoiceLineNodeType.UnallocatedStock &&
            isCreated &&
            numberOfPacks > 0
        )
        .map(outboundParsers.toInsertPlaceholder),
      updateOutboundShipmentUnallocatedLines: draftOutboundLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            type === InvoiceLineNodeType.UnallocatedStock &&
            !isCreated &&
            isUpdated &&
            numberOfPacks > 0
        )
        .map(outboundParsers.toUpdatePlaceholder),
      deleteOutboundShipmentUnallocatedLines: draftOutboundLines
        .filter(
          ({ type, numberOfPacks, isUpdated, isCreated }) =>
            type === InvoiceLineNodeType.UnallocatedStock &&
            numberOfPacks === 0 &&
            isUpdated &&
            !isCreated
        )
        .map(outboundParsers.toDeletePlaceholder),
      insertOutboundShipmentServiceLines: draftOutboundLines
        .filter(
          ({ type, isCreated, isDeleted }) =>
            type === InvoiceLineNodeType.Service && !isDeleted && isCreated
        )
        .map(outboundParsers.toInsertServiceCharge),
      updateOutboundShipmentServiceLines: draftOutboundLines
        .filter(
          ({ type, isUpdated, isCreated, isDeleted }) =>
            type === InvoiceLineNodeType.Service &&
            !isDeleted &&
            !isCreated &&
            isUpdated
        )
        .map(outboundParsers.toUpdateServiceCharge),
      deleteOutboundShipmentServiceLines: draftOutboundLines
        .filter(
          ({ type, isCreated, isDeleted }) =>
            type === InvoiceLineNodeType.Service && isDeleted && !isCreated
        )
        .map(outboundParsers.toDeleteServiceCharge),
    };

    const result = await sdk.upsertOutboundShipment({ storeId, input });

    return result;
  },
  allocateLines: async (
    allocatedOutboundShipmentUnallocatedLines: string[]
  ) => {
    const input = {
      allocatedOutboundShipmentUnallocatedLines,
    };

    const result = (await sdk.upsertOutboundShipment({ storeId, input })) || {};
    const { batchOutboundShipment } = result;

    if (batchOutboundShipment?.__typename === 'BatchOutboundShipmentResponse') {
      return batchOutboundShipment;
    }

    throw new Error('Unable to allocate lines');
  },
  deleteLines: async (lines: { id: string; invoiceId: string }[]) => {
    return sdk.deleteOutboundShipmentLines({
      storeId,
      deleteOutboundShipmentLines: lines.map(outboundParsers.toDeleteLine),
    });
  },
  updateTax: async ({
    lines,
    tax,
    type,
  }: {
    lines: OutboundLineFragment[];
    tax: number;
    type: InvoiceLineNodeType.StockOut | InvoiceLineNodeType.Service;
  }) => {
    const toUpdateStockLine = (line: OutboundLineFragment) =>
      outboundParsers.toUpdateLine({ ...line, taxPercentage: tax });
    const toUpdateServiceLine = (line: OutboundLineFragment) =>
      outboundParsers.toUpdateServiceCharge({ ...line, taxPercentage: tax });

    const result =
      (await sdk.upsertOutboundShipment({
        storeId,
        input: {
          updateOutboundShipmentLines:
            type === InvoiceLineNodeType.StockOut
              ? lines.filter(isA.stockOutLine).map(toUpdateStockLine)
              : [],
          updateOutboundShipmentServiceLines:
            type === InvoiceLineNodeType.Service
              ? lines.filter(isA.serviceLine).map(toUpdateServiceLine)
              : [],
        },
      })) || {};

    const { batchOutboundShipment } = result;

    if (batchOutboundShipment?.__typename === 'BatchOutboundShipmentResponse') {
      return batchOutboundShipment;
    }

    throw new Error('Unable to update invoice');
  },
  dashboard: {
    shipmentCount: async (): Promise<{
      toBePicked: number;
    }> => {
      const result = await sdk.invoiceCounts({ storeId });
      return {
        toBePicked: result?.invoiceCounts?.outbound.toBePicked ?? 0,
      };
    },
  },
});
