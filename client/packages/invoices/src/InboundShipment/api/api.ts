import {
  InvoiceNodeType,
  InvoiceSortFieldInput,
  FilterBy,
  SortBy,
  InvoiceNodeStatus,
  UpdateInboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  DeleteInboundShipmentLineInput,
  UpdateInboundShipmentInput,
  formatNaiveDate,
  UpdateInboundShipmentStatusInput,
} from '@openmsupply-client/common';
import { Invoice, InvoiceLine } from '../../types';
import { InvoiceRow } from './../../types';
import { Sdk } from './operations.generated';
import { DraftInboundLine } from '../DetailView/modals/InboundLineEdit';

const inboundParsers = {
  toStatus: (
    patch: Partial<Invoice>
  ): UpdateInboundShipmentStatusInput | undefined => {
    switch (patch.status) {
      case InvoiceNodeStatus.Verified:
        return UpdateInboundShipmentStatusInput.Verified;
      case InvoiceNodeStatus.Delivered:
        return UpdateInboundShipmentStatusInput.Delivered;
      default:
        return undefined;
    }
  },
  toSortField: (sortBy: SortBy<InvoiceRow>): InvoiceSortFieldInput => {
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
  toUpdate: (
    patch: Partial<Invoice> & { id: string }
  ): UpdateInboundShipmentInput => {
    return {
      id: patch.id,
      colour: patch.colour,
      comment: patch.comment,
      status: inboundParsers.toStatus(patch),
      onHold: patch.onHold,
      otherPartyId: patch.otherParty?.id,
      theirReference: patch.theirReference,
    };
  },
  toInsertLine: (line: DraftInboundLine): InsertInboundShipmentLineInput => {
    return {
      id: line.id,
      itemId: line.itemId,
      batch: line.batch,
      costPricePerPack: line.costPricePerPack,
      sellPricePerPack: line.sellPricePerPack,
      expiryDate: line.expiryDate
        ? formatNaiveDate(new Date(line.expiryDate))
        : null,
      packSize: line.packSize,
      numberOfPacks: line.numberOfPacks,
      totalAfterTax: 0,
      totalBeforeTax: 0,
      invoiceId: line.invoiceId,
      locationId: line.location?.id,
    };
  },
  toUpdateLine: (line: DraftInboundLine): UpdateInboundShipmentLineInput => ({
    id: line.id,
    itemId: line.itemId,
    batch: line.batch,
    costPricePerPack: line.costPricePerPack,
    expiryDate: line.expiryDate
      ? formatNaiveDate(new Date(line.expiryDate))
      : null,
    sellPricePerPack: line.sellPricePerPack,
    packSize: line.packSize,
    numberOfPacks: line.numberOfPacks,
    invoiceId: line.invoiceId,
    locationId: line.location?.id,
  }),
  toDeleteLine:
    (invoiceId: string) =>
    (id: string): DeleteInboundShipmentLineInput => {
      return { id, invoiceId };
    },
};

export const getInboundQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: {
      first: number;
      offset: number;
      sortBy: SortBy<InvoiceRow>;
      filterBy: FilterBy | null;
    }) => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.InboundShipment },
      };
      const result = await sdk.invoices({
        first,
        offset,
        key: inboundParsers.toSortField(sortBy),
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
        const lineNodes = invoice.lines.nodes;
        const lines: InvoiceLine[] = lineNodes.map(line => {
          const stockLine = line.stockLine;
          const location = line.location;

          return {
            ...line,
            stockLine,
            location,
            stockLineId: stockLine?.id ?? '',
            invoiceId: invoice.id,
            unitName: line.item?.unitName ?? '',
          };
        });

        return {
          ...invoice,
          lines,
        };
      }

      throw new Error(result.invoice.__typename);
    },
    byNumber: async (invoiceNumber: string) => {
      const result = await sdk.inboundByNumber({
        invoiceNumber: Number(invoiceNumber),
        storeId,
      });

      const invoice = result.invoiceByNumber;

      if (invoice.__typename === 'InvoiceNode') {
        const lineNodes = invoice.lines.nodes;
        const lines: InvoiceLine[] = lineNodes.map(line => {
          const stockLine = line.stockLine;
          const location = line.location;

          return {
            ...line,
            stockLine,
            location,
            stockLineId: stockLine?.id ?? '',
            invoiceId: invoice.id,
            unitName: line.item?.unitName ?? '',
          };
        });

        return {
          ...invoice,
          lines,
        };
      }

      throw new Error('Could not find invoice!');
    },
  },
  delete: async (invoices: InvoiceRow[]): Promise<string[]> => {
    const result = await sdk.deleteInboundShipments({
      storeId,
      deleteInboundShipments: invoices.map(invoice => ({ id: invoice.id })),
    });

    const { batchInboundShipment } = result;

    if (batchInboundShipment.deleteInboundShipments) {
      return batchInboundShipment.deleteInboundShipments.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  },
  insert: async (invoice: Partial<Invoice>): Promise<number> => {
    const result = await sdk.insertInboundShipment({
      id: invoice.id ?? '',
      otherPartyId: invoice?.otherPartyId ?? '',
      storeId,
    });

    const { insertInboundShipment } = result;

    if (insertInboundShipment.__typename === 'InvoiceNode') {
      return insertInboundShipment.invoiceNumber;
    }

    throw new Error(insertInboundShipment.error.description);
  },
  update: async (patch: Partial<Invoice> & { id: string }) =>
    sdk.updateInboundShipment({
      input: inboundParsers.toUpdate(patch),
      storeId,
    }),
  deleteLines: async (invoiceId: string, ids: string[]) => {
    const createDeleteLineInput = inboundParsers.toDeleteLine(invoiceId);
    return sdk.deleteInboundShipmentLines({
      storeId,
      input: { deleteInboundShipmentLines: ids.map(createDeleteLineInput) },
    });
  },
  upsertLines: async (lines: DraftInboundLine[]) => {
    const insertInboundShipmentLines = lines
      .filter(({ isCreated }) => isCreated)
      .map(inboundParsers.toInsertLine);
    const updateInboundShipmentLines = lines
      .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
      .map(inboundParsers.toUpdateLine);

    return sdk.upsertInboundShipment({
      storeId,
      input: {
        insertInboundShipmentLines,
        updateInboundShipmentLines,
      },
    });
  },
  dashboard: {
    shipmentCount: async (): Promise<{
      today: number;
      thisWeek: number;
    }> => {
      const result = await sdk.invoiceCounts({ storeId });

      return {
        thisWeek: result.invoiceCounts.inbound.created?.thisWeek ?? 0,
        today: result.invoiceCounts.inbound.created?.today ?? 0,
      };
    },
  },
});
