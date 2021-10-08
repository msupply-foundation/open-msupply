import { db } from '../data';

export const insert = {
  invoice: invoice => {
    return db.insert.invoice(invoice);
  },
  invoiceLine: invoiceLine => {
    return db.insert.invoiceLine(invoiceLine);
  },
};

export const update = {
  invoice: invoice => {
    return db.update.invoice(invoice);
  },
  invoiceLine: invoiceLine => {
    return db.update.byId.invoiceLine(invoiceLine);
  },
};

export const remove = {
  invoice: invoice => {
    return db.remove.invoice(invoice.id);
  },
  invoiceLine: invoiceLine => {
    return db.remove.insert(invoiceLine);
  },
};

export const MutationService = {
  update,
  remove,
  insert,
};
