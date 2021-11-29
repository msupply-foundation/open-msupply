import { StocktakeLineMutation } from './stocktakeLine';
import { InvoiceMutation } from './invoice';
import { InvoiceLineMutation } from './invoiceLine';
import { RequisitionMutation } from './requisition';
import { RequisitionLineMutation } from './requisitionLine';
import { StocktakeMutation } from './stocktake';

export const MutationService = {
  requisition: RequisitionMutation,
  requisitionLine: RequisitionLineMutation,
  invoice: InvoiceMutation,
  invoiceLine: InvoiceLineMutation,
  stocktake: StocktakeMutation,
  stocktakeLine: StocktakeLineMutation,
};
