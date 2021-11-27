import { Api } from '../api';
import { InvoiceLine as InvoiceLineType } from './../data/types';

const QueryResolvers = {};

const MutationResolvers = {
  updateOutboundShipmentLine: (
    _: unknown,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.update.invoiceLine(invoiceLine);
  },
  deleteOutboundShipmentLine: (
    _: unknown,
    { invoiceLineId }: { invoiceLineId: string }
  ): string => {
    return Api.MutationService.remove.invoiceLine(invoiceLineId);
  },
};

export const InvoiceLine = {
  QueryResolvers,
  MutationResolvers,
};
