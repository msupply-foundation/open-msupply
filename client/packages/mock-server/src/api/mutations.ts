import { ResolverService } from './resolvers';
import { createInvoice } from './../data/data';
import { Api } from './index';
import { StockLine } from './../data/types';
import { db } from '../data';
import { Invoice, InvoiceLine } from '../data/types';

const adjustStockLineQuantity = (
  stockLineId: string,
  quantity: number
): StockLine => {
  const stockLine = db.get.byId.stockLine(stockLineId);
  const newQuantity = stockLine.availableNumberOfPacks + quantity;

  if (newQuantity < 0) {
    throw new Error(
      `Quantity invalid - reducing ${stockLine.availableNumberOfPacks} by ${quantity}`
    );
  }

  const newStockLine = db.update.stockLine({
    ...stockLine,
    availableNumberOfPacks: newQuantity,
  });

  return newStockLine;
};

export const insert = {
  invoice: (invoice: Invoice): Invoice => {
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

    const createdInvoice = db.insert.invoice(
      createInvoice(invoice.id, invoiceNumber, invoice.nameId)
    );

    return createdInvoice;
  },
  invoiceLine: (invoiceLine: InvoiceLine): InvoiceLine => {
    const existing = db.get.byId.invoiceLine(invoiceLine.id);

    if (existing.id) {
      throw new Error(
        `InvoiceLine with the ID ${invoiceLine.id} already exists!`
      );
    }

    adjustStockLineQuantity(invoiceLine.stockLineId, -invoiceLine.quantity);

    return db.insert.invoiceLine(invoiceLine);
  },
};

export const update = {
  invoice: (invoice: Invoice): Invoice => {
    return db.update.invoice(invoice);
  },
  invoiceLine: (invoiceLine: InvoiceLine): InvoiceLine => {
    const currentInvoiceLine = db.get.byId.invoiceLine(invoiceLine.id);
    const { quantity } = currentInvoiceLine;
    const difference = quantity - invoiceLine.quantity;

    adjustStockLineQuantity(invoiceLine.stockLineId, difference);

    return db.update.invoiceLine(invoiceLine);
  },
};

export const remove = {
  invoice: (invoiceId: string): string => {
    const resolvedInvoice = Api.ResolverService.byId.invoice(String(invoiceId));

    resolvedInvoice.lines.forEach(line => {
      remove.invoiceLine(line.id);
    });

    return db.remove.invoice(invoiceId);
  },
  invoiceLine: (invoiceLineId: string): string => {
    const invoiceLine = ResolverService.byId.invoiceLine(invoiceLineId);

    adjustStockLineQuantity(invoiceLine.stockLineId, invoiceLine.quantity);

    return db.remove.invoiceLine(invoiceLineId);
  },
};

export const MutationService = {
  update,
  remove,
  insert,
};
