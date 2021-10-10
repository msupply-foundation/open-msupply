import { db } from '../data';
import { Invoice, InvoiceLine } from '../data/types';

export const insert = {
  invoice: (invoice: Invoice): Invoice => {
    return db.insert.invoice(invoice);
  },
  invoiceLine: (invoiceLine: InvoiceLine): InvoiceLine => {
    return db.insert.invoiceLine(invoiceLine);
  },
};

export const update = {
  invoice: (invoice: Invoice): Invoice => {
    return db.update.invoice(invoice);
  },
  invoiceLine: (invoiceLine: InvoiceLine): InvoiceLine => {
    return db.update.invoiceLine(invoiceLine);
  },
};

export const remove = {
  invoice: (invoice: Invoice): Invoice => {
    return db.remove.invoice(invoice);
  },
  invoiceLine: (invoiceLine: InvoiceLine): InvoiceLine => {
    return db.remove.invoiceLine(invoiceLine);
  },
};

export const MutationService = {
  update,
  remove,
  insert,
};
