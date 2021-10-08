import { getSumFn, getDataSorter } from '../utils';
import { db } from '../data/database';

const getAvailableQuantity = itemId => {
  const stockLines = db.get.stockLines.byItemId(itemId);

  const quantity = stockLines.reduce(getSumFn('availableNumberOfPacks'), 0);

  return quantity;
};

export const ResolverService = {
  list: {
    invoice: ({ first = 50, offset = 0, sort, desc } = {}) => {
      const invoices = db.get.all.invoice();

      if (sort) {
        const sortData = getDataSorter(sort, desc);
        invoices.sort(sortData);
      }

      const paged = invoices.slice(offset, offset + first);
      const data = paged.map(invoice => {
        return ResolverService.byId.invoice(invoice.id);
      });

      return { totalLength: invoices.length, data };
    },
    item: () => {
      return db.get.all.item();
    },
    stockLine: () => {
      return db.get.all.stockLine();
    },
  },

  byId: {
    item: id => {
      const item = db.get.byId.item(id);
      return {
        ...item,
        availableQuantity: () => getAvailableQuantity(id),
      };
    },
    stockLine: id => {
      const stockLine = db.get.byId.stockLine(id);
      return {
        ...stockLine,
        item: ResolverService.byId.item(stockLine.itemId),
      };
    },
    invoiceLine: id => {
      const invoiceLine = db.get.byId.invoiceLine(id);

      return {
        ...invoiceLine,
        stockLine: ResolverService.byId.stockLine(invoiceLine.stockLineId),
        item: ResolverService.byId.item(invoiceLine.itemId),
      };
    },
    invoice: id => {
      const invoice = db.get.byId.invoice(id);
      return {
        ...invoice,
        lines: db.get.invoiceLines
          .byInvoiceId(id)
          .map(({ id: invoiceLineId }) =>
            ResolverService.byId.invoiceLine(invoiceLineId)
          ),
      };
    },
  },
};
