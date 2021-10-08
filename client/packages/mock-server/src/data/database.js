import {
  TransactionData as InvoiceData,
  InvoiceLineData,
  ItemData,
  StockLineData,
} from './data';

// Importing this from utils causes a circular deps loop and you will not have fun :)
export const getFilter = (matchVal, key) => obj => obj[key] === matchVal;

export const get = {
  id: {
    item: id => ItemData.findIndex(getFilter(id, 'id')),
    stockLine: id => StockLineData.findIndex(getFilter(id, 'id')),
    invoice: id => InvoiceData.findIndex(getFilter(id, 'id')),
    invoiceLine: id => InvoiceLineData.findIndex(getFilter(id, 'id')),
  },

  byId: {
    item: id => ({ ...ItemData.find(getFilter(id, 'id')) }),
    stockLine: id => ({ ...StockLineData.find(getFilter(id, 'id')) }),
    invoice: id => ({ ...InvoiceData.find(getFilter(id, 'id')) }),
    invoiceLine: id => ({ ...InvoiceLineData.find(getFilter(id, 'id')) }),
  },

  all: {
    item: () => ItemData.slice(),
    stockLine: () => StockLineData.slice(),
    invoice: () => InvoiceData.slice(),
    invoiceLine: () => InvoiceLineData.slice(),
  },

  stockLines: {
    byItemId: itemId => StockLineData.filter(getFilter(itemId, 'itemId')),
  },

  invoicesLines: {
    byInvoiceId: invoiceId =>
      InvoiceLineData.filter(getFilter(invoiceId, 'transactionId')),
  },
};

export const update = {
  invoice: invoice => {
    const idx = InvoiceData.findIndex(getFilter(invoice.id, 'id'));
    if (idx < 0) throw new Error('Invalid invoice id');
    const newInvoice = { ...InvoiceData[idx], ...invoice };
    InvoiceData[idx] = newInvoice;
    return newInvoice;
  },
  invoiceLine: invoiceLine => {
    const idx = InvoiceLineData.findIndex(getFilter(invoiceLine.id, 'id'));
    if (idx < 0) throw new Error('Invalid invoice line id');
    const newLine = { ...InvoiceLineData[idx], invoiceLine };
    InvoiceLineData[idx] = newLine;
    return newLine;
  },
};

export const insert = {
  invoice: invoice => {
    InvoiceData.push(invoice);
    return invoice;
  },
  invoiceLine: invoiceLine => {
    InvoiceLineData.push(invoiceLine);
    return invoiceLine;
  },
};

export const remove = {
  byId: {
    invoice: invoice => {
      const idx = get.id.invoice(invoice.id);
      InvoiceData.splice(idx);
      return invoice;
    },
    invoiceLine: invoiceLine => {
      const idx = get.id.invoiceLine(invoiceLine.id);
      InvoiceLineData.splice(idx);
      return invoiceLine;
    },
  },
};

export const db = {
  get,
  update,
  insert,
  remove,
};
