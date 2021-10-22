import { Api } from '../api';
import { InvoiceLine as InvoiceLineType } from './../data/types';

const QueryResolvers = {};

const MutationResolvers = {
  updateCustomerInvoiceLine: (
    _: any,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.update.invoiceLine(invoiceLine);
  },
  deleteCustomerInvoiceLine: (
    _: any,
    { invoiceLineId }: { invoiceLineId: string }
  ): string => {
    return Api.MutationService.remove.invoiceLine(invoiceLineId);
  },
  insertCustomerInvoiceLine: (
    _: any,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.insert.invoiceLine(invoiceLine);
  },
};

export const InvoiceLine = {
  QueryResolvers,
  MutationResolvers,
};
