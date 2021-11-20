import {
  InvoiceNodeType,
  InsertOutboundShipmentLineInput,
  UpdateOutboundShipmentLineInput,
  UpdateInboundShipmentInput,
  UpdateOutboundShipmentInput,
  InvoiceNodeStatus,
} from '@openmsupply-client/common/src/types';

import { ResolverService } from './resolvers';
import {
  createInvoice,
  adjustStockLineAvailableNumberOfPacks,
  adjustStockLineTotalNumberOfPacks,
} from './../data/data';
import { Api } from './index';
import { ResolvedInvoice } from './../data/types';
import { db } from '../data';
import { Invoice, InvoiceLine } from '../data/types';

export const insert = {
  invoice: (invoice: Invoice): Invoice & { __typename: string } => {
    const existing = db.get.byId.invoice(invoice.id);
    if (existing.id) {
      throw new Error(`Invoice with the ID ${invoice.id} already exists!`);
    }

    const allInvoices = db.get.all.invoice();
    const invoiceNumber =
      allInvoices.reduce(
        (acc, invoice) => Math.max(Number(invoice.invoiceNumber), acc),
        0
      ) + 1;

    const otherPartyName = db.get.byId.name(invoice.otherPartyId);
    const createdInvoice = db.insert.invoice(
      createInvoice(
        invoice.id,
        invoiceNumber,
        otherPartyName,
        InvoiceNodeType.OutboundShipment
      )
    );

    return { ...createdInvoice, __typename: 'InvoiceNode' };
  },
  invoiceLine: (
    invoiceLine: InsertOutboundShipmentLineInput
  ): InsertOutboundShipmentLineInput => {
    const invoice = db.get.byId.invoice(invoiceLine.invoiceId);
    const existing = db.get.byId.invoiceLine(invoiceLine.id);

    if (existing.id) {
      throw new Error(
        `InvoiceLine with the ID ${invoiceLine.id} already exists!`
      );
    }

    if (
      invoice.type === InvoiceNodeType.InboundShipment &&
      invoice.status !== InvoiceNodeStatus.Draft
    ) {
      adjustStockLineAvailableNumberOfPacks(
        invoiceLine.stockLineId,
        invoiceLine.numberOfPacks
      );
      adjustStockLineTotalNumberOfPacks(
        invoiceLine.stockLineId,
        invoiceLine.numberOfPacks
      );
    }

    if (invoice.type === InvoiceNodeType.OutboundShipment) {
      adjustStockLineAvailableNumberOfPacks(
        invoiceLine.stockLineId,
        -invoiceLine.numberOfPacks
      );

      if (invoice.status === InvoiceNodeStatus.Confirmed) {
        adjustStockLineTotalNumberOfPacks(
          invoiceLine.stockLineId,
          -invoiceLine.numberOfPacks
        );
      }
    }

    return db.insert.invoiceLine(invoiceLine);
  },
};

const getStatusTime = (status: string | undefined | null) => {
  switch (status) {
    case 'ALLOCATED': {
      return { allocatedDatetime: new Date().toISOString() };
    }
    case 'SHIPPED': {
      return { shippedDatetime: new Date().toISOString() };
    }
    case 'PICKED': {
      return { pickedDatetime: new Date().toISOString() };
    }
  }

  return {};
};

export const update = {
  invoice: (
    invoice: UpdateOutboundShipmentInput | UpdateInboundShipmentInput
  ): ResolvedInvoice => {
    const updated = db.update.invoice({
      ...invoice,
      ...getStatusTime(invoice.status),
    });
    const resolvedInvoice = ResolverService.byId.invoice(updated.id);

    return resolvedInvoice;
  },
  invoiceLine: (invoiceLine: UpdateOutboundShipmentLineInput): InvoiceLine => {
    const invoice = db.get.byId.invoice(invoiceLine.invoiceId);
    const currentInvoiceLine = db.get.byId.invoiceLine(invoiceLine.id);
    const { numberOfPacks } = currentInvoiceLine;

    const difference = numberOfPacks - (invoiceLine?.numberOfPacks ?? 0);

    if (
      invoice.type === InvoiceNodeType.InboundShipment &&
      invoice.status !== InvoiceNodeStatus.Draft
    ) {
      adjustStockLineAvailableNumberOfPacks(
        currentInvoiceLine.stockLineId,
        -difference
      );
      adjustStockLineTotalNumberOfPacks(
        currentInvoiceLine.stockLineId,
        -difference
      );
    }

    if (invoice.type === InvoiceNodeType.OutboundShipment) {
      adjustStockLineAvailableNumberOfPacks(
        currentInvoiceLine.stockLineId,
        difference
      );

      if (invoice.status === InvoiceNodeStatus.Confirmed) {
        adjustStockLineTotalNumberOfPacks(
          currentInvoiceLine.stockLineId,
          difference
        );
      }
    }

    return db.update.invoiceLine(invoiceLine);
  },
};

export const remove = {
  invoice: (invoiceId: string): string => {
    const resolvedInvoice = Api.ResolverService.byId.invoice(String(invoiceId));

    if (resolvedInvoice.type === InvoiceNodeType.InboundShipment) {
      if (
        resolvedInvoice.status === InvoiceNodeStatus.Confirmed ||
        resolvedInvoice.status === InvoiceNodeStatus.Finalised
      ) {
        throw new Error("Can't delete delivered or finalised invoice");
      }
    }

    resolvedInvoice.lines.nodes.forEach(line => {
      remove.invoiceLine(line.id);
    });

    return db.remove.invoice(invoiceId);
  },
  invoiceLine: (invoiceLineId: string): string => {
    const invoiceLine = ResolverService.byId.invoiceLine(invoiceLineId);
    const invoice = db.get.byId.invoice(invoiceLine.invoiceId);
    const { numberOfPacks } = invoiceLine;

    if (
      invoice.type === InvoiceNodeType.InboundShipment &&
      invoice.status !== InvoiceNodeStatus.Draft
    ) {
      adjustStockLineAvailableNumberOfPacks(
        invoiceLine.stockLineId,
        -numberOfPacks
      );
      adjustStockLineTotalNumberOfPacks(
        invoiceLine.stockLineId,
        -numberOfPacks
      );
    }

    if (invoice.type === InvoiceNodeType.OutboundShipment) {
      adjustStockLineAvailableNumberOfPacks(
        invoiceLine.stockLineId,
        numberOfPacks
      );

      if (invoice.status === InvoiceNodeStatus.Confirmed) {
        adjustStockLineTotalNumberOfPacks(
          invoiceLine.stockLineId,
          numberOfPacks
        );
      }
    }

    return db.remove.invoiceLine(invoiceLineId);
  },
};

export const MutationService = {
  update,
  remove,
  insert,
};
