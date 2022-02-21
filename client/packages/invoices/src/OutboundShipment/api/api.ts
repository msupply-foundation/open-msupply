import { DraftOutboundLine } from './../../types';
import {
  DeleteOutboundShipmentLineInput,
  RecordPatch,
  UpdateOutboundShipmentInput,
  InvoiceNodeStatus,
  UpdateOutboundShipmentStatusInput,
  NameResponse,
  InvoicePriceResponse,
  InvoiceLineConnector,
  ConnectorError,
  StockLineResponse,
  StockLineNode,
  LocationResponse,
  ItemNode,
  ItemResponse,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
} from '@openmsupply-client/common';
import { Location } from '@openmsupply-client/system';
import { Invoice, InvoiceLine } from '../../types';
import { getSdk, InvoiceQuery } from './operations.generated';

export type OutboundShipmentApi = ReturnType<typeof getSdk>;

const otherPartyGuard = (otherParty: NameResponse) => {
  if (otherParty.__typename === 'NameNode') {
    return otherParty;
  } else if (otherParty.__typename === 'NodeError') {
    throw new Error(otherParty.error.description);
  }

  throw new Error('Unknown');
};

export const pricingGuard = (pricing: InvoicePriceResponse) => {
  if (pricing.__typename === 'InvoicePricingNode') {
    return pricing;
  } else if (pricing.__typename === 'NodeError') {
    throw new Error(pricing.error.description);
  } else {
    throw new Error('Unknown');
  }
};

const invoiceGuard = (invoiceQuery: InvoiceQuery) => {
  if (invoiceQuery.invoice.__typename === 'InvoiceNode') {
    return invoiceQuery.invoice;
  }

  throw new Error(invoiceQuery.invoice.error.description);
};

const linesGuard = (invoiceLines: InvoiceLineConnector | ConnectorError) => {
  if (invoiceLines.__typename === 'InvoiceLineConnector') {
    return invoiceLines.nodes;
  }

  if (invoiceLines.__typename === 'ConnectorError') {
    throw new Error(invoiceLines.error.description);
  }

  throw new Error('Unknown');
};

const stockLineGuard = (stockLine: StockLineResponse): StockLineNode => {
  if (stockLine.__typename === 'StockLineNode') {
    return stockLine;
  }

  throw new Error('Unknown');
};

const locationGuard = (location: LocationResponse): Location => {
  if (location.__typename === 'LocationNode') {
    return location;
  }

  throw new Error('Unknown');
};

const itemGuard = (item: ItemResponse): ItemNode => {
  if (item.__typename === 'ItemNode') {
    return item;
  }

  throw new Error('Unknown');
};

const getPatchStatus = (patch: RecordPatch<Invoice>) => {
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
};

const invoiceToInput = (
  patch: RecordPatch<Invoice>
): UpdateOutboundShipmentInput => ({
  id: patch.id,
  colour: patch.colour,
  comment: patch.comment,
  status: getPatchStatus(patch),
  onHold: patch.onHold,
  otherPartyId: patch.otherParty?.id,
  theirReference: patch.theirReference,
});

const getCreateDeleteOutboundLineInput =
  (invoiceId: string) =>
  (id: string): DeleteOutboundShipmentLineInput => {
    return { id, invoiceId };
  };

const createInsertOutboundLineInput = (
  line: DraftOutboundLine
): InsertOutboundShipmentLineInput => {
  return {
    id: line.id,
    itemId: line.itemId,
    numberOfPacks: line.numberOfPacks,
    stockLineId: line.stockLineId,
    invoiceId: line.invoiceId,
    totalAfterTax: 0,
    totalBeforeTax: 0,
  };
};

const createUpdateOutboundLineInput = (
  line: DraftOutboundLine
): UpdateOutboundShipmentLineInput => {
  return {
    id: line.id,
    invoiceId: line.invoiceId,
    numberOfPacks: line.numberOfPacks,
    stockLineId: line.stockLineId,
  };
};

export const OutboundApi = {
  get: {
    byId:
      (api: OutboundShipmentApi, storeId: string) =>
      async (id: string): Promise<Invoice> => {
        const result = await api.invoice({ id, storeId });

        const invoice = invoiceGuard(result);
        // TODO:
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const lineNodes = linesGuard(invoice.lines);
        const lines: InvoiceLine[] = lineNodes.map(line => {
          const stockLine = line.stockLine
            ? stockLineGuard(line.stockLine)
            : undefined;
          const location = line.location
            ? locationGuard(line.location)
            : undefined;
          const item = line.item ? itemGuard(line.item) : undefined;

          return {
            ...line,
            stockLine,
            location,
            stockLineId: stockLine?.id ?? '',
            invoiceId: invoice.id,
            unitName: item?.unitName ?? '',
          };
        });

        return {
          ...invoice,
          lines,
          pricing: pricingGuard(invoice.pricing),
          otherParty: otherPartyGuard(invoice.otherParty),
        };
      },
  },
  update:
    (api: OutboundShipmentApi) =>
    async (patch: RecordPatch<Invoice>): Promise<RecordPatch<Invoice>> => {
      const result = await api.upsertOutboundShipment({
        input: {
          updateOutboundShipments: [invoiceToInput(patch)],
        },
      });

      const { batchOutboundShipment } = result;

      if (
        batchOutboundShipment.__typename === 'BatchOutboundShipmentResponse'
      ) {
        const { updateOutboundShipments } = batchOutboundShipment;
        if (
          updateOutboundShipments?.[0]?.__typename ===
          'UpdateOutboundShipmentResponseWithId'
        ) {
          return patch;
        }
      }

      throw new Error('Unable to update invoice');
    },
  updateLines:
    (api: OutboundShipmentApi) =>
    async (draftStocktakeLines: DraftOutboundLine[]) => {
      const input = {
        insertOutboundShipmentLines: draftStocktakeLines
          .filter(({ isCreated }) => isCreated)
          .map(createInsertOutboundLineInput),
        updateOutboundShipmentLines: draftStocktakeLines
          .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
          .map(createUpdateOutboundLineInput),
      };

      const result = await api.upsertOutboundShipment({ input });

      return result;
    },
  deleteLines:
    (api: OutboundShipmentApi, invoiceId: string) => async (ids: string[]) => {
      const createDeleteLineInput = getCreateDeleteOutboundLineInput(invoiceId);
      return api.deleteOutboundShipmentLines({
        deleteOutboundShipmentLines: ids.map(createDeleteLineInput),
      });
    },
};
