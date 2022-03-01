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
  InsertOutboundShipmentInput,
  UpdateOutboundShipmentLineInput,
  InvoiceLineNodeType,
  InvoiceSortFieldInput,
} from '@openmsupply-client/common';
import { DraftOutboundLine, Invoice, InvoiceLine } from '../../types';
import {
  getSdk,
  OutboundShipmentRowFragment,
  Sdk,
} from './operations.generated';

export type OutboundShipmentApi = ReturnType<typeof getSdk>;

const outboundParsers = {
  toSortKey: (
    sortBy: SortBy<OutboundShipmentRowFragment>
  ): InvoiceSortFieldInput => {
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
  toStatus: (patch: RecordPatch<Invoice>) => {
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
    patch: Partial<OutboundShipmentRowFragment>
  ): InsertOutboundShipmentInput => ({
    id: patch.id ?? '',
    otherPartyId: patch.otherPartyId ?? '',
  }),
  toUpdate: (patch: RecordPatch<Invoice>): UpdateOutboundShipmentInput => ({
    id: patch.id,
    colour: patch.colour,
    comment: patch.comment,
    status: outboundParsers.toStatus(patch),
    onHold: patch.onHold,
    otherPartyId: patch.otherParty?.id,
    theirReference: patch.theirReference,
  }),
  toInsertLine: (line: DraftOutboundLine): InsertOutboundShipmentLineInput => {
    return {
      id: line.id,
      itemId: line.itemId,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLineId,
      invoiceId: line.invoiceId,
      totalAfterTax: 0,
      totalBeforeTax: 0,
    };
  },
  toUpdateLine: (line: DraftOutboundLine): UpdateOutboundShipmentLineInput => {
    return {
      id: line.id,
      invoiceId: line.invoiceId,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLineId,
    };
  },
  toInsertPlaceholder: (
    line: DraftOutboundLine
  ): InsertOutboundShipmentUnallocatedLineInput => ({
    id: line.id,
    quantity: line.numberOfPacks,
    invoiceId: line.invoiceId,
    itemId: line.itemId,
  }),
  toUpdatePlaceholder: (
    line: DraftOutboundLine
  ): UpdateOutboundShipmentUnallocatedLineInput => ({
    id: line.id,
    quantity: line.numberOfPacks,
  }),
  toDeleteLine: (
    invoiceId: string,
    id: string
  ): DeleteOutboundShipmentLineInput => ({
    invoiceId,
    id,
  }),
};

export const getOutboundQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<OutboundShipmentRowFragment>;
      filterBy: FilterBy | null;
    }): Promise<{
      nodes: OutboundShipmentRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.OutboundShipment },
      };
      const result = await sdk.invoices({
        first,
        offset,
        key: outboundParsers.toSortKey(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result.invoices;
    },
    byId: async (id: string): Promise<Invoice> => {
      const result = await sdk.invoice({ id, storeId });
      const invoice = result.invoice;

      if (invoice.__typename === 'InvoiceNode') {
        const lineNodes = invoice.lines;
        const lines: InvoiceLine[] = lineNodes.nodes.map(line => {
          return {
            ...line,
            stockLineId: line.stockLine?.id ?? '',
            invoiceId: invoice.id,
            unitName: line.item?.unitName ?? '',
          };
        });

        return {
          ...invoice,
          lines,
        };
      } else {
        throw new Error('Could not find invoice');
      }
    },
    byNumber: async (invoiceNumber: string): Promise<Invoice> => {
      const result = await sdk.outboundByNumber({
        invoiceNumber: Number(invoiceNumber),
        storeId,
      });
      const invoice = result.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        const lineNodes = invoice.lines;
        const lines: InvoiceLine[] = lineNodes.nodes.map(line => {
          return {
            ...line,
            stockLineId: line.stockLine?.id ?? '',
            invoiceId: invoice.id,
            unitName: line.item?.unitName ?? '',
          };
        });

        return {
          ...invoice,
          lines,
        };
      } else {
        throw new Error('Could not find invoice');
      }
    },
  },
  insert: async (
    invoice: Partial<OutboundShipmentRowFragment>
  ): Promise<number> => {
    const result = await sdk.insertOutboundShipment({
      id: invoice.id ?? '',
      otherPartyId: invoice?.otherPartyId ?? '',
      storeId,
    });

    const { insertOutboundShipment } = result;

    if (insertOutboundShipment.__typename === 'InvoiceNode') {
      return insertOutboundShipment.invoiceNumber;
    }

    throw new Error('Could not insert invoice');
  },
  delete: async (
    invoices: OutboundShipmentRowFragment[]
  ): Promise<string[]> => {
    const result = await sdk.deleteOutboundShipments({
      storeId,
      deleteOutboundShipments: invoices.map(invoice => invoice.id),
    });

    const { batchOutboundShipment } = result;
    if (batchOutboundShipment.deleteOutboundShipments) {
      return batchOutboundShipment.deleteOutboundShipments.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  },
  update: async (
    patch: RecordPatch<Invoice>
  ): Promise<RecordPatch<Invoice>> => {
    const result = await sdk.upsertOutboundShipment({
      storeId,
      input: {
        updateOutboundShipments: [outboundParsers.toUpdate(patch)],
      },
    });

    const { batchOutboundShipment } = result;

    if (batchOutboundShipment.__typename === 'BatchOutboundShipmentResponse') {
      return patch;
    }

    throw new Error('Unable to update invoice');
  },
  updateLines: async (draftStocktakeLines: DraftOutboundLine[]) => {
    const filtered = draftStocktakeLines.filter(
      ({ numberOfPacks }) => numberOfPacks > 0
    );
    const input = {
      insertOutboundShipmentLines: filtered
        .filter(
          ({ type, isCreated }) =>
            isCreated && type === InvoiceLineNodeType.StockOut
        )
        .map(outboundParsers.toInsertLine),
      updateOutboundShipmentLines: filtered
        .filter(
          ({ type, isCreated, isUpdated }) =>
            !isCreated && isUpdated && type === InvoiceLineNodeType.StockOut
        )
        .map(outboundParsers.toUpdateLine),
      insertOutboundShipmentUnallocatedLines: filtered
        .filter(
          ({ type, isCreated }) =>
            type === InvoiceLineNodeType.UnallocatedStock && isCreated
        )
        .map(outboundParsers.toInsertPlaceholder),
      updateOutboundShipmentUnallocatedLines: filtered
        .filter(
          ({ type, isCreated, isUpdated }) =>
            type === InvoiceLineNodeType.UnallocatedStock &&
            !isCreated &&
            isUpdated
        )
        .map(outboundParsers.toUpdatePlaceholder),
    };

    const result = await sdk.upsertOutboundShipment({ storeId, input });

    return result;
  },
  deleteLines: (invoiceId: string) => async (ids: string[]) => {
    return sdk.deleteOutboundShipmentLines({
      storeId,
      deleteOutboundShipmentLines: ids.map(id =>
        outboundParsers.toDeleteLine(invoiceId, id)
      ),
    });
  },
  dashboard: {
    shipmentCount: async (): Promise<{
      toBePicked: number;
    }> => {
      const result = await sdk.invoiceCounts({ storeId });
      return {
        toBePicked: result.invoiceCounts.outbound.toBePicked ?? 0,
      };
    },
  },
});
