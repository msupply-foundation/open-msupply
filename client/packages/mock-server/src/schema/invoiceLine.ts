import { Api } from '../api';
import { InvoiceLine as InvoiceLineType } from './../data/types';

const QueryResolvers = {};

const MutationResolvers = {
  updateOutboundShipmentLine: (
    _: any,
    { invoiceLine }: { invoiceLine: InvoiceLineType }
  ): InvoiceLineType => {
    return Api.MutationService.update.invoiceLine(invoiceLine);
  },
  deleteOutboundShipmentLine: (
    _: any,
    { invoiceLineId }: { invoiceLineId: string }
  ): string => {
    return Api.MutationService.remove.invoiceLine(invoiceLineId);
  },
};

export const InvoiceLine = {
  QueryResolvers,
  MutationResolvers,
};
