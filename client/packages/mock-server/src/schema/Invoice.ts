import { ResolvedInvoice } from './../data/types';
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
    invoiceNumber: Int
    total: String
    name: Name
    otherPartyName: String
    hold: Boolean
    lines: [InvoiceLine]
}

type InvoiceResponse { 
  data: [Invoice]
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
  invoiceByInvoiceNumber: (
    _: any,
    { invoiceNumber }: { invoiceNumber: number }
  ): ResolvedInvoice => {
    return Api.ResolverService.invoice.get.byInvoiceNumber(invoiceNumber);
  },
};

const MutationResolvers = {
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
  deleteInvoice: (_: any, { invoiceId }: { invoiceId: string }): string => {
    return Api.MutationService.remove.invoice(invoiceId);
  },
};

const Queries = `
invoices(first: Int, offset: Int, sort: String, desc: Boolean): InvoiceResponse
invoice(id: String): Invoice
invoiceByInvoiceNumber(invoiceNumber: Int): Invoice
`;

const Mutations = `
updateInvoice(invoice: InvoicePatch): Invoice
insertInvoice(invoice: InvoicePatch): Invoice
deleteInvoice(invoiceId: String): Invoice
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
    invoiceNumber: Int
    total: String
    nameId: String
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
