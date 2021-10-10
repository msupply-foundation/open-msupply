import { ListResponse } from './../index';
import { Api } from '../api';
import { PaginationOptions } from '../index';
import { Invoice as InvoiceType } from '../data/types';

const Types = `
    type Invoice {
        id: String
        color: String
        comment: String
        status: String
        type: String
        entered: String
        confirmed: String
        invoiceNumber: String
        total: String
        name: String
        lines: [InvoiceLine]
    }

    type InvoiceResponse { 
      data: [Invoice],
      totalLength: Int
    }
  `;

const QueryResolvers = {
  invoices: (
    _: any,
    { first = 50, offset = 0, sort, desc }: PaginationOptions
  ): ListResponse<InvoiceType> =>
    Api.ResolverService.list.invoice({ first, offset, sort, desc }),

  invoice: (_: any, { id }: { id: string }): InvoiceType => {
    return Api.ResolverService.byId.invoice(id);
  },
};

const MutationResolvers = {
  deleteInvoices: (
    _: any,
    { invoices }: { invoices: InvoiceType[] }
  ): InvoiceType[] => {
    invoices.forEach(invoice => {
      Api.MutationService.remove.invoice(invoice);
    });

    return invoices;
  },
  updateInvoice: (
    _: any,
    { invoice }: { invoice: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(invoice);
  },
  insertInvoice: (
    _: any,
    { invoice }: { invoice: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.insert.invoice(invoice);
  },
  deleteInvoice: (_: any, invoice: InvoiceType): InvoiceType => {
    return Api.MutationService.remove.invoice(invoice);
  },
};

const Queries = `
    invoices(first: Int, offset: Int, sort: String, desc: Boolean): InvoiceResponse
    invoice(id: String!): Invoice
`;

const Mutations = `
    updateInvoice(invoice: InvoicePatch): Invoice
    insertInvoice(invoice: InvoicePatch): Invoice
    deleteInvoice(invoice: InvoicePatch): Invoice
    deleteInvoices(invoice: [InvoicePatch]): [Invoice]
`;

const Inputs = `
    input InvoicePatch {
        id: String
        color: String
        comment: String
        status: String
        type: String
        entered: String
        confirmed: String
        invoiceNumber: String
        total: String
        name: String
    }
`;

export const Invoice = {
  Mutations,
  Types,
  QueryResolvers,
  Queries,
  MutationResolvers,
  Inputs,
};
