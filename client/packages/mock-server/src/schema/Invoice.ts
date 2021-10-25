import { Api } from '../api';

import { ListResponse, Invoice as InvoiceType } from '../data/types';

const QueryResolvers = {
  invoices: (
    _: any,
    {
      page = { first: 10, offset: 0 },
      sort = { key: 'TYPE', desc: false },
    }: {
      page: { first: number; offset: number };
      sort: { key: string; desc: boolean };
    }
  ): ListResponse<InvoiceType> => {
    return Api.ResolverService.list.invoice({
      first: page.first,
      offset: page.offset,
      desc: sort.desc,
      sort: sort.key,
    });
  },

  invoice: (_: any, { id }: { id: string }): InvoiceType => {
    return Api.ResolverService.byId.invoice(id);
  },
};

const MutationResolvers = {
  updateCustomerInvoice: (
    _: any,
    { invoice }: { invoice: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(invoice);
  },
  insertCustomerInvoice: (
    _: any,
    { input }: { input: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.insert.invoice(input);
  },
  deleteCustomerInvoice: (
    _: any,
    { invoiceId }: { invoiceId: string }
  ): string => {
    return Api.MutationService.remove.invoice(invoiceId);
  },
};

export const Invoice = {
  QueryResolvers,
  MutationResolvers,
};
