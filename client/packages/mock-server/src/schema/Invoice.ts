import {
  InvoiceSortFieldInput,
  InvoiceFilterInput,
} from '@openmsupply-client/common/src/types/schema';
import { Api } from '../api';

import { ListResponse, Invoice as InvoiceType } from '../data/types';

const QueryResolvers = {
  invoices: (
    _: any,
    vars: {
      page?: { first?: number; offset?: number };
      sort: [{ key: InvoiceSortFieldInput; desc: boolean }];
      filter?: InvoiceFilterInput;
    }
  ): ListResponse<InvoiceType> => {
    return Api.ResolverService.list.invoice({
      first: vars.page?.first ?? 20,
      offset: vars.page?.offset ?? 0,
      desc: vars.sort[0].desc ?? false,
      key: vars.sort[0].key ?? InvoiceSortFieldInput.Status,
      filter: vars.filter,
    });
  },

  invoice: (_: any, { id }: { id: string }): InvoiceType => {
    return Api.ResolverService.byId.invoice(id);
  },
};

const MutationResolvers = {
  updateOutboundShipment: (
    _: any,
    { invoice }: { invoice: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.update.invoice(invoice);
  },
  insertOutboundShipment: (
    _: any,
    { input }: { input: InvoiceType }
  ): InvoiceType => {
    return Api.MutationService.insert.invoice(input);
  },
  deleteOutboundShipment: (
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
