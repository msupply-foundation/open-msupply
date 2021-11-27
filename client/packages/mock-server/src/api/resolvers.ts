import {
  ItemsResponse,
  StockLineConnector,
} from './../../../common/src/types/schema';
import {
  ResolvedItem,
  ResolvedInvoice,
  ResolvedStockLine,
  ResolvedInvoiceLine,
  Name,
  ListResponse,
  ResolvedInvoiceCounts,
  ResolvedStockCounts,
  ResolvedRequisition,
  ResolvedRequisitionLine,
  ItemListParameters,
} from './../data/types';

import { db } from '../data/database';
import {
  InvoiceSortFieldInput,
  InvoicesQueryVariables,
  NamesQueryVariables,
  ItemSortFieldInput,
  NameSortFieldInput,
  InvoiceNodeType,
  RequisitionListParameters,
} from '@openmsupply-client/common/src/types/schema';
import { getDataSorter } from '@openmsupply-client/common/src/utils/arrays/sorters';

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
    // case InvoiceSortFieldInput.ConfirmDatetime: {
    //   return 'allocatedDatetime';
    // }
    case InvoiceSortFieldInput.EntryDatetime: {
      return 'entryDatetime';
    }
    case InvoiceSortFieldInput.Comment: {
      return 'comment';
    }
    // case InvoiceSortFieldInput.TotalAfterTax: {
    //   return 'totalAfterTax';
    // }
    // case InvoiceSortFieldInput.OtherPartyName: {
    //   return 'otherPartyName';
    // }
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

const createTypedListResponse = <T, K>(
  totalCount: number,
  nodes: T[],
  typeName: K
) => ({
  totalCount,
  nodes,
  __typename: typeName,
});

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
  stockLine: {
    byId: (id: string): ResolvedStockLine => {
      const stockLine = db.stockLine.get.byId(id);
      const item = db.item.get.byId(stockLine.itemId);
      return { ...stockLine, item, __typename: 'StockLineNode' };
    },
    list: (lines = db.stockLine.get.all()): StockLineConnector => {
      const resolved = lines.map(line =>
        ResolverService.stockLine.byId(line.id)
      );
      const totalCount = resolved.length;
      const nodes = resolved.map(stockLine =>
        ResolverService.stockLine.byId(stockLine.id)
      );
      return { totalCount, nodes, __typename: 'StockLineConnector' };
    },
  },
  item: {
    byId: (id: string): ResolvedItem => {
      const item = db.item.get.byId(id);
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }

      const stockLines = db.stockLine.get.byItemId(id);
      const availableBatches = ResolverService.stockLine.list(stockLines);

      const availableQuantity = getAvailableQuantity(id);

      return {
        __typename: 'ItemNode',
        ...item,
        availableQuantity,
        availableBatches,
      };
    },
    list: (params: ItemListParameters): ItemsResponse => {
      const items = db.get.all.item();
      const resolvedItems = items.map(item =>
        ResolverService.item.byId(item.id)
      );

      const { filter, page = {}, sort = [] } = params ?? {};
      const { offset = 0, first = 20 } = page ?? {};
      const { key = 'name', desc = false } = sort && sort[0] ? sort[0] : {};

      let filtered = resolvedItems;

      if (filter) {
        filtered = filtered.filter(({ code, name }) => {
          if (filter.code?.equalTo) {
            return code.toLowerCase() === filter.code.equalTo.toLowerCase();
          }

          if (filter.code?.like) {
            return code
              .toLowerCase()
              .includes(filter.code.like.toLowerCase() ?? '');
          }

          if (filter.name?.equalTo) {
            return name.toLowerCase() === filter.name.equalTo.toLowerCase();
          }

          if (filter.name?.like) {
            return name.toLowerCase().includes(filter.name.like.toLowerCase());
          }

          return true;
        });
      }

      const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

      if (key) {
        paged.sort(getDataSorter(getItemsSortKey(key), !!desc));
      }

      return createTypedListResponse(filtered.length, paged, 'ItemConnector');
    },
  },

  requisitionLine: {
    byId: (id: string): ResolvedRequisitionLine => {
      const requisitionLine = db.requisitionLine.get.byId(id);
      if (!requisitionLine) {
        throw new Error(`RequisitionLine with id ${id} not found`);
      }

      return {
        ...requisitionLine,
        __typename: 'RequisitionLineNode',
      };
    },
    byRequisitionId: (requisitionId: string): ResolvedRequisitionLine[] => {
      const requisitionLines =
        db.requisitionLine.get.byRequisitionId(requisitionId);

      return requisitionLines.map(requisitionLine =>
        ResolverService.requisitionLine.byId(requisitionLine.id)
      );
    },
  },

  requisition: {
    get: {
      byId: (id: string): ResolvedRequisition => {
        const requisition = db.requisition.get.byId(id);
        const otherParty = db.get.byId.name(requisition.otherPartyId);
        const nodes = ResolverService.requisitionLine.byRequisitionId(id);
        return {
          ...requisition,
          lines: {
            __typename: 'RequisitionLineConnector',
            totalCount: nodes.length,
            nodes,
          },
          otherParty,
          otherPartyName: otherParty.name,
          __typename: 'RequisitionNode',
        };
      },
      list: (
        params: RequisitionListParameters
      ): ListResponse<ResolvedRequisition> => {
        const requisitions = db.requisition.get.list();

        const { filter, page = {}, sort = [] } = params ?? {};

        const { offset = 0, first = 20 } = page ?? {};
        const { key = 'otherPartyName', desc = false } =
          sort && sort[0] ? sort[0] : {};

        const resolved = requisitions.map(requisition => {
          return ResolverService.requisition.get.byId(requisition.id);
        });

        let filtered = resolved;
        if (filter) {
          if (filter.type) {
            filtered = filtered.filter(requisition => {
              return requisition.type === filter.type?.equalTo;
            });
          }
        }

        const paged = filtered.slice(
          offset ?? 0,
          (offset ?? 0) + (first ?? 20)
        );

        if (key) {
          paged.sort(getDataSorter(key, !!desc));
        }

        return createListResponse(
          filtered.length,
          paged,
          'RequisitionConnector'
        );
      },
    },
  },

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

      const resolved = invoices.map(invoice => {
        return ResolverService.byId.invoice(invoice.id);
      });

      let filtered = resolved;
      if (filter) {
        if (filter.type) {
          filtered = filtered.filter(invoice => {
            return invoice.type === filter.type?.equalTo;
          });
        }
        if (filter.comment) {
          filtered = filtered.filter(invoice => {
            if (filter.comment?.equalTo) {
              return invoice.type === filter.comment?.equalTo;
            } else if (filter.comment?.like) {
              return invoice?.comment
                ?.toLowerCase()
                .includes(filter.comment?.like?.toLowerCase());
            } else {
              return true;
            }
          });
        }
      }

      const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

      if (key) {
        paged.sort(getDataSorter(getInvoiceSortKey(key), !!desc));
      }

      return createListResponse(filtered.length, paged, 'InvoiceConnector');
    },
    // item: (params: ItemListParameters): ItemsResponse => {
    //   const items = db.get.all.item();

    //   const { filter, page = {}, sort = [] } = params ?? {};
    //   const { offset = 0, first = 20 } = page ?? {};
    //   const { key = 'name', desc = false } = sort && sort[0] ? sort[0] : {};

    //   const resolved = items.map(item => {
    //     return ResolverService.byId.item(item.id);
    //   });

    //   let filtered = resolved;

    //   if (filter) {
    //     filtered = filtered.filter(({ code, name }) => {
    //       if (filter.code?.equalTo) {
    //         return code.toLowerCase() === filter.code.equalTo.toLowerCase();
    //       }

    //       if (filter.code?.like) {
    //         return code
    //           .toLowerCase()
    //           .includes(filter.code.like.toLowerCase() ?? '');
    //       }

    //       if (filter.name?.equalTo) {
    //         return name.toLowerCase() === filter.name.equalTo.toLowerCase();
    //       }

    //       if (filter.name?.like) {
    //         return name.toLowerCase().includes(filter.name.like.toLowerCase());
    //       }

    //       return true;
    //     });
    //   }

    //   const paged = filtered.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

    //   if (key) {
    //     paged.sort(getDataSorter(getItemsSortKey(key), !!desc));
    //   }

    //   return createTypedListResponse(filtered.length, paged, 'ItemConnector');
    // },

    name: ({
      first = 50,
      offset = 0,
      key,
      desc,
    }: NamesQueryVariables): ListResponse<Name> => {
      // TODO: Filter customers/suppliers etc
      const names = db.get.all.name().filter(({ isCustomer }) => isCustomer);

      if (key) {
        names.sort(getDataSorter(getNamesSortKey(key), !!desc));
      }

      const paged = names.slice(offset ?? 0, (offset ?? 0) + (first ?? 20));

      return createListResponse(paged.length, paged, 'NameConnector');
    },
  },

  byId: {
    // item: (id: string): ResolvedItem => {
    //   const item = db.get.byId.item(id);
    //   const stockLines = db.get.stockLines.byItemId(id);
    //   const resolvedStockLines = stockLines.map(stockLine =>
    //     db.get.byId.stockLine(stockLine.id)
    //   );
    //   const availableBatches = createListResponse(
    //     resolvedStockLines.length,
    //     resolvedStockLines,
    //     'StockLineConnector'
    //   );

    //   return {
    //     __typename: 'ItemNode',
    //     ...item,
    //     availableQuantity: getAvailableQuantity(id),
    //     availableBatches,
    //   };
    // },
    stockLine: (id: string): ResolvedStockLine => {
      const stockLine = db.get.byId.stockLine(id);
      return {
        ...stockLine,
        __typename: 'StockLineNode',
        item: ResolverService.item.byId(stockLine.itemId),
      };
    },
    invoiceLine: (id: string): ResolvedInvoiceLine => {
      const invoiceLine = db.get.byId.invoiceLine(id);

      return {
        __typename: 'InvoiceLineNode',
        ...invoiceLine,
        stockLine: invoiceLine.stockLineId
          ? ResolverService.byId.stockLine(invoiceLine.stockLineId)
          : undefined,
        item: ResolverService.item.byId(invoiceLine.itemId),
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
