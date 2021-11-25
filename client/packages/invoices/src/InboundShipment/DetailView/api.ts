import {
  InvoiceQuery,
  InvoiceLineConnector,
  InvoicePriceResponse,
  ConnectorError,
  NameResponse,
  InvoiceNodeStatus,
  OmSupplyApi,
  StockLineResponse,
  StockLineNode,
  UpdateInboundShipmentLineInput,
  InsertInboundShipmentLineInput,
  DeleteInboundShipmentLineInput,
  UpdateInboundShipmentInput,
  formatNaiveDate,
} from '@openmsupply-client/common';

import {
  OutboundShipmentRow,
  Invoice,
  InvoiceLine,
  InboundShipment,
  InboundShipmentRow,
} from '../../types';
import { flattenInboundItems } from '../../utils';

const otherPartyGuard = (otherParty: NameResponse) => {
  if (otherParty.__typename === 'NameNode') {
    return otherParty;
  } else if (otherParty.__typename === 'NodeError') {
    throw new Error(otherParty.error.description);
  }

  throw new Error('Unknown');
};

const pricingGuard = (pricing: InvoicePriceResponse) => {
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

const invoiceToInput = (
  patch: Partial<InboundShipment> & { id: string }
): UpdateInboundShipmentInput => {
  return {
    id: patch.id,
    // color: patch.color,
    comment: patch.comment,

    // TODO: Don't cast status
    status: patch.status as InvoiceNodeStatus,
    onHold: patch.onHold,
    otherPartyId: patch.otherParty?.id,
    theirReference: patch.theirReference,
  };
};

const createInsertInboundLineInput =
  (invoiceId: string) =>
  (line: OutboundShipmentRow): InsertInboundShipmentLineInput => {
    return {
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
      invoiceId,
    };
  };

const createDeleteInboundLineInput = (
  line: InboundShipmentRow
): DeleteInboundShipmentLineInput => {
  return {
    id: line.id,
    invoiceId: line.invoiceId,
  };
};

const createUpdateInboundLineInput = (
  line: InboundShipmentRow
): UpdateInboundShipmentLineInput => {
  return {
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
  };
};

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getInboundShipmentDetailViewApi = (
  api: OmSupplyApi
): Api<Invoice, InboundShipment> => ({
  onRead: async (id: string): Promise<Invoice> => {
    const result = await api.invoice({ id });

    const invoice = invoiceGuard(result);

    const lineNodes = linesGuard(invoice.lines);

    const lines: InvoiceLine[] = lineNodes.map(line => {
      const stockLine = line.stockLine
        ? stockLineGuard(line.stockLine)
        : undefined;

      return {
        ...line,
        stockLine,
        stockLineId: stockLine?.id ?? '',
        invoiceId: invoice.id,
      };
    });

    return {
      ...invoice,
      lines,
      pricing: pricingGuard(invoice.pricing),
      otherParty: otherPartyGuard(invoice.otherParty),
    };
  },
  onUpdate: async (patch: InboundShipment): Promise<InboundShipment> => {
    const rows = flattenInboundItems(patch.items);
    const deleteLines = rows.filter(({ isDeleted }) => isDeleted);
    const insertLines = rows.filter(
      ({ isCreated, isDeleted }) => !isDeleted && isCreated
    );
    const updateLines = rows.filter(
      ({ isUpdated, isCreated, isDeleted }) =>
        isUpdated && !isCreated && !isDeleted
    );

    const result = await api.upsertInboundShipment({
      updateInboundShipments: [invoiceToInput(patch)],
      insertInboundShipmentLines: insertLines.map(
        createInsertInboundLineInput(patch.id)
      ),
      deleteInboundShipmentLines: deleteLines.map(createDeleteInboundLineInput),
      updateInboundShipmentLines: updateLines.map(createUpdateInboundLineInput),
    });

    const { batchInboundShipment } = result;

    if (batchInboundShipment.__typename === 'BatchInboundShipmentResponse') {
      const { updateInboundShipments } = batchInboundShipment;
      if (
        updateInboundShipments?.[0]?.__typename ===
        'UpdateInboundShipmentResponseWithId'
      ) {
        return patch;
      }
    }

    throw new Error(':shrug');
  },
});
