import { InvoiceSortFieldInput } from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';

import { ListResponse, Invoice as InvoiceType } from '../data/types';

const QueryResolvers = {
  invoices: (
    _: any,
    vars: {
      page?: { first?: number; offset?: number };
      sort: [{ key: InvoiceSortFieldInput; desc: boolean }];
    }
  ): ListResponse<InvoiceType> => {
    return Api.ResolverService.list.invoice({
      first: vars.page?.first ?? 20,
      offset: vars.page?.offset ?? 0,
      desc: vars.sort[0].desc ?? false,
      key: vars.sort[0].key ?? InvoiceSortFieldInput.Status,
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
