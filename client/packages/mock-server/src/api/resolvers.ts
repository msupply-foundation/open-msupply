import {
  ResolvedItem,
  ResolvedInvoice,
  ResolvedStockLine,
  ResolvedInvoiceLine,
  Name,
  PaginationOptions,
  ListResponse,
} from './../data/types';

import { getSumFn, getDataSorter } from '../utils';
import { db } from '../data/database';

const getAvailableQuantity = (itemId: string): number => {
  const stockLines = db.get.stockLines.byItemId(itemId);
  const sumFn = getSumFn('availableNumberOfPacks');
  const quantity = stockLines.reduce(sumFn, 0);
  return quantity;
};

const createListResponse = <T>(
  totalCount: number,
  nodes: T[],
  typeName: string
) => ({
  totalCount,
  nodes,
  __typename: typeName,
});

export const ResolverService = {
  invoice: {
    get: {
      byInvoiceNumber: (invoiceNumber: number): ResolvedInvoice => {
        const invoice = db.invoice.get.byInvoiceNumber(invoiceNumber);
        const name = db.get.byId.name(invoice.otherPartyId);

        const lines = db.get.invoiceLines
          .byInvoiceId(invoice.id)
          .map(({ id: invoiceLineId }) =>
            ResolverService.byId.invoiceLine(invoiceLineId)
          );
        const resolvedLinesList = createListResponse(
          lines.length,
          lines,
          'InvoiceLineConnector'
        );

        return {
          __typename: 'InvoiceNode',
          ...invoice,
          name,
          otherPartyName: name.name,
          lines: resolvedLinesList,
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

      return createListResponse(invoices.length, data, 'InvoiceConnector');
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

      return createListResponse(invoiceLines.length, data, 'InvoiceConnector');
    },
    item: (): ListResponse<ResolvedItem> => {
      const items = db.get.all.item();
      const data = items.map(item => {
        return ResolverService.byId.item(item.id);
      });
      return createListResponse(items.length, data, 'ItemConnector');
    },

    name: (type: 'customer' | 'supplier'): ListResponse<Name> => {
      // TODO: Filter customers/suppliers etc
      const names = db.get.all.name().filter(({ isCustomer }) => {
        return isCustomer === (type === 'customer');
      });

      return createListResponse(names.length, names, 'NameConnector');
    },
  },

  byId: {
    item: (id: string): ResolvedItem => {
      const item = db.get.byId.item(id);
      const stockLines = db.get.stockLines.byItemId(id);
      const resolvedStockLines = stockLines.map(stockLine =>
        db.get.byId.stockLine(stockLine.id)
      );
      const availableBatches = createListResponse(
        resolvedStockLines.length,
        resolvedStockLines,
        'StockLineConnector'
      );

      return {
        __typename: 'ItemNode',
        ...item,
        availableQuantity: getAvailableQuantity(id),
        availableBatches,
      };
    },
    stockLine: (id: string): ResolvedStockLine => {
      const stockLine = db.get.byId.stockLine(id);
      return {
        ...stockLine,
        __typename: 'StockLineNode',
        item: ResolverService.byId.item(stockLine.itemId),
      };
    },
    invoiceLine: (id: string): ResolvedInvoiceLine => {
      const invoiceLine = db.get.byId.invoiceLine(id);

      return {
        __typename: 'InvoiceLineNode',
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
      const name = db.get.byId.name(invoice.otherPartyId);

      const lines = db.get.invoiceLines
        .byInvoiceId(invoice.id)
        .map(({ id: invoiceLineId }) =>
          ResolverService.byId.invoiceLine(invoiceLineId)
        );
      const resolvedLinesList = createListResponse(
        lines.length,
        lines,
        'InvoiceLineConnector'
      );

      return {
        __typename: 'InvoiceNode',
        ...invoice,
        name,
        otherPartyName: name.name,
        lines: resolvedLinesList,
      };
    },
  },
};
