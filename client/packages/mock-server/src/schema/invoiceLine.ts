import { PaginationOptions, ListResponse } from './../index';
import { Api } from '../api';
import { InvoiceLine as InvoiceLineType } from './../data/types';

const Types = `
    type InvoiceLine {
      id: String 
      itemName: String 
      itemCode: String
      stockLine: StockLine 
      item: Item
      quantity: Int
      batchName: String
      expiry: String
    }

    type InvoiceLineResponse {
      data: [InvoiceLine]
      totalLength: Int
    }
  `;

const Queries = `
    invoiceLines(first: Int, offset: Int, sort: String, desc: Boolean): InvoiceLineResponse
    invoiceLine(id: String!): InvoiceLine
`;

const Mutations = `
    updateInvoiceLine(invoiceLine: InvoiceLinePatch): InvoiceLine
    insertInvoiceLine(invoiceLine: InvoiceLinePatch): InvoiceLine
    deleteInvoiceLine(invoiceLine: InvoiceLinePatch): InvoiceLine
    deleteInvoiceLines(invoiceLine: [InvoiceLinePatch]): [InvoiceLine]
`;

const Inputs = `
    input InvoiceLinePatch {
      id: String 
      stockLineId: String
      invoiceId: String
      itemName: String 
      itemCode: String
      quantity: Int
      batchName: String
      expiry: String
    }
`;

const QueryResolvers = {
  invoiceLines: (
    _: any,
    { first = 50, offset = 0, sort, desc }: PaginationOptions
  ): ListResponse<InvoiceLineType> =>
    Api.ResolverService.list.invoiceLine({ first, offset, sort, desc }),

  invoiceLine: (_: any, { id }: { id: string }): InvoiceLineType => {
    return Api.ResolverService.byId.invoiceLine(id);
  },
};

const MutationResolvers = {
  updateInvoiceLine: (
    _: any,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.update.invoiceLine(invoiceLine);
  },
  deleteInvoiceLine: (
    _: any,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.remove.invoiceLine(invoiceLine);
  },
  insertInvoiceLine: (
    _: any,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.insert.invoiceLine(invoiceLine);
  },
};

export const InvoiceLine = {
  Mutations,
  Types,
  QueryResolvers,
  Queries,
  MutationResolvers,
  Inputs,
};
