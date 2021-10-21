import {
  ResolvedItem,
  ResolvedInvoice,
  ResolvedStockLine,
  ResolvedInvoiceLine,
  Name,
} from './../data/types';
import { PaginationOptions, ListResponse } from './../index';
import { getSumFn, getDataSorter } from '../utils';
import { db } from '../data/database';

const getAvailableQuantity = (itemId: string): number => {
  const stockLines = db.get.stockLines.byItemId(itemId);
  const sumFn = getSumFn('availableNumberOfPacks');
  const quantity = stockLines.reduce(sumFn, 0);
  return quantity;
};

const createListResponse = <T>(totalLength: number, data: T[]) => ({
  totalLength,
  data,
});

export const ResolverService = {
  invoice: {
    get: {
      byInvoiceNumber: (invoiceNumber: number): ResolvedInvoice => {
        const invoice = db.invoice.get.byInvoiceNumber(invoiceNumber);
        const name = db.get.byId.name(invoice.nameId);

        return {
          ...invoice,
          name,
          otherPartyName: name.name,
          lines: db.get.invoiceLines
            .byInvoiceId(invoice.id)
            .map(({ id: invoiceLineId }) =>
              ResolverService.byId.invoiceLine(invoiceLineId)
            ),
        };
      },
    },
  },
  list: {
    invoice: ({
      first = 50,
      offset = 0,
      sort,
      desc,
    }: PaginationOptions): ListResponse<ResolvedInvoice> => {
      const invoices = db.get.all.invoice();

      if (sort) {
        const sortData = getDataSorter(sort as string, desc);
        invoices.sort(sortData);
      }

      const paged = invoices.slice(offset, offset + first);
      const data = paged.map(invoice => {
        return ResolverService.byId.invoice(invoice.id);
      });

      return createListResponse(invoices.length, data);
    },
    invoiceLine: ({
      first = 50,
      offset = 0,
      sort,
      desc,
    }: PaginationOptions): ListResponse<ResolvedInvoiceLine> => {
      const invoiceLines = db.get.all.invoiceLine();

      if (sort) {
        const sortData = getDataSorter(sort as string, desc);
        invoiceLines.sort(sortData);
      }

      const paged = invoiceLines.slice(offset, offset + first);
      const data = paged.map(invoice => {
        return ResolverService.byId.invoiceLine(invoice.id);
      });

      return createListResponse(invoiceLines.length, data);
    },
    item: (): ListResponse<ResolvedItem> => {
      const items = db.get.all.item();
      const data = items.map(item => {
        return ResolverService.byId.item(item.id);
      });
      return createListResponse(items.length, data);
    },

    name: (type: 'customer' | 'supplier'): ListResponse<Name> => {
      // TODO: Filter customers/suppliers etc
      const names = db.get.all.name().filter(({ isCustomer }) => {
        return isCustomer === (type === 'customer');
      });

      return createListResponse(names.length, names);
    },
    stockLine: (): ListResponse<ResolvedStockLine> => {
      const stockLines = db.get.all.stockLine();

      const data = stockLines.map(stockLine => {
        return ResolverService.byId.stockLine(stockLine.id);
      });
      return createListResponse(data.length, data);
    },
  },

  byId: {
    item: (id: string): ResolvedItem => {
      const item = db.get.byId.item(id);
      return {
        ...item,
        availableQuantity: getAvailableQuantity(id),
        availableBatches: {
          nodes: db.get.stockLines.byItemId(id),
        },
      };
    },
    stockLine: (id: string): ResolvedStockLine => {
      const stockLine = db.get.byId.stockLine(id);
      return {
        ...stockLine,
        item: ResolverService.byId.item(stockLine.itemId),
      };
    },
    invoiceLine: (id: string): ResolvedInvoiceLine => {
      const invoiceLine = db.get.byId.invoiceLine(id);

      return {
        ...invoiceLine,
        stockLine: ResolverService.byId.stockLine(invoiceLine.stockLineId),
        item: ResolverService.byId.item(invoiceLine.itemId),
      };
    },
    name: (id: string): Name => {
      return db.get.byId.name(id);
    },
    invoice: (id: string): ResolvedInvoice => {
      const invoice = db.get.byId.invoice(id);
      const name = db.get.byId.name(invoice.nameId);
      return {
        ...invoice,
        name,
        otherPartyName: name.name,
        lines: db.get.invoiceLines
          .byInvoiceId(invoice.id)
          .map(({ id: invoiceLineId }) =>
            ResolverService.byId.invoiceLine(invoiceLineId)
          ),
      };
    },
  },
};
