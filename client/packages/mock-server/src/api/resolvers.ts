import {
  ResolvedItem,
  ResolvedInvoice,
  ResolvedStockLine,
  ResolvedInvoiceLine,
  Name,
  ListResponse,
  ResolvedInvoiceCounts,
  ResolvedStockCounts,
} from './../data/types';

import { getDataSorter } from '../utils';
import { db } from '../data/database';
import {
  InvoiceSortFieldInput,
  InvoicesQueryVariables,
  ItemsListViewQueryVariables,
  NamesQueryVariables,
  ItemSortFieldInput,
  NameSortFieldInput,
  InvoiceNodeType,
} from '@openmsupply-client/common/src/types/schema';

const getAvailableQuantity = (itemId: string): number => {
  const stockLines = db.get.stockLines.byItemId(itemId);
  const availableQuantity = stockLines.reduce(
    (sum, { availableNumberOfPacks, packSize }) => {
      return sum + availableNumberOfPacks * packSize;
    },
    0
  );

  return availableQuantity;
};

const getInvoiceSortKey = (key: string) => {
  switch (key) {
    case InvoiceSortFieldInput.ConfirmDatetime: {
      return 'confirmedDatetime';
    }
    case InvoiceSortFieldInput.EntryDatetime: {
      return 'entryDatetime';
    }
    case InvoiceSortFieldInput.FinalisedDateTime: {
      return 'finalisedDatetime';
    }
    case InvoiceSortFieldInput.Comment: {
      return 'comment';
    }
    case InvoiceSortFieldInput.TotalAfterTax: {
      return 'totalAfterTax';
    }
    case InvoiceSortFieldInput.OtherPartyName: {
      return 'otherPartyName';
    }
    case InvoiceSortFieldInput.InvoiceNumber: {
      return 'invoiceNumber';
    }
    case InvoiceSortFieldInput.Status:
    default: {
      return 'status';
    }
  }
};

const getItemsSortKey = (key: string) => {
  switch (key) {
    case ItemSortFieldInput.Code: {
      return 'code';
    }
    case ItemSortFieldInput.Name:
    default: {
      return 'name';
    }
  }
};

const getNamesSortKey = (key: string) => {
  switch (key) {
    case NameSortFieldInput.Code: {
      return 'code';
    }
    case NameSortFieldInput.Name:
    default: {
      return 'name';
    }
  }
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
          otherParty: name,
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
      key,
      desc,
      filter,
    }: InvoicesQueryVariables): ListResponse<ResolvedInvoice> => {
      const invoices = db.get.all.invoice();

      const paged = invoices.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));
      const data = paged.map(invoice => {
        return ResolverService.byId.invoice(invoice.id);
      });

      if (key) {
        const sortData = getDataSorter(getInvoiceSortKey(key), !!desc);
        data.sort(sortData);
      }

      let filteredData = data;
      if (filter) {
        filteredData = data.filter(({ otherPartyName }) => {
          if (filter.otherPartyName?.equalTo) {
            return otherPartyName === filter.otherPartyName.equalTo;
          }

          if (filter.otherPartyName?.like) {
            return otherPartyName.includes(filter.otherPartyName.like ?? '');
          }

          return true;
        });
      }

      return createListResponse(
        invoices.length,
        filteredData,
        'InvoiceConnector'
      );
    },
    item: ({
      first = 50,
      offset = 0,
      key,
      desc,
    }: ItemsListViewQueryVariables): ListResponse<ResolvedItem> => {
      const items = db.get.all.item();

      if (key) {
        const sortData = getDataSorter(getItemsSortKey(key), !!desc);
        items.sort(sortData);
      }

      const paged = items.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

      const data = paged.map(item => {
        return ResolverService.byId.item(item.id);
      });

      return createListResponse(items.length, data, 'ItemConnector');
    },

    name: ({
      first = 50,
      offset = 0,
      key,
      desc,
    }: NamesQueryVariables): ListResponse<Name> => {
      // TODO: Filter customers/suppliers etc
      const names = db.get.all.name().filter(({ isCustomer }) => isCustomer);

      if (key) {
        const sortData = getDataSorter(getNamesSortKey(key), !!desc);
        names.sort(sortData);
      }

      const paged = names.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

      return createListResponse(paged.length, paged, 'NameConnector');
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
        otherParty: { __typename: 'NameNode', ...name },
        otherPartyName: name.name,
        lines: resolvedLinesList,
      };
    },
  },
  statistics: {
    invoice: (type: InvoiceNodeType): ResolvedInvoiceCounts => {
      const getStats = (type: InvoiceNodeType) => {
        switch (type) {
          case InvoiceNodeType.OutboundShipment:
            return db.get.statistics.outboundShipment;
          case InvoiceNodeType.InboundShipment:
            return db.get.statistics.inboundShipment;
          default:
            return {};
        }
      };

      return {
        __typename: 'InvoiceCountsConnector',
        ...getStats(type),
      };
    },
    stock: (): ResolvedStockCounts => ({
      __typename: 'StockCountsConnector',
      ...db.get.statistics.stock,
    }),
  },
};
