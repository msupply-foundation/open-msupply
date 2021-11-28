import { InvoiceMutation } from './invoice';
import { InvoiceLineMutation } from './invoiceLine';
import { RequisitionMutation } from './requisition';
import { RequisitionLineMutation } from './requisitionLine';

export const MutationService = {
  requisition: RequisitionMutation,
  requisitionLine: RequisitionLineMutation,
  invoice: InvoiceMutation,
  invoiceLine: InvoiceLineMutation,
};
