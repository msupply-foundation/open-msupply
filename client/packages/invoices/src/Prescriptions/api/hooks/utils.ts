import {
  InvoiceNodeStatus,
  InvoiceSortFieldInput,
  RecordPatch,
  UpdatePrescriptionStatusInput,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../operations.generated';

export const sortFieldMap: Record<string, InvoiceSortFieldInput> = {
  createdDateTime: InvoiceSortFieldInput.CreatedDatetime,
  prescriptionDatetime: InvoiceSortFieldInput.InvoiceDatetime,
  otherPartyName: InvoiceSortFieldInput.OtherPartyName,
  comment: InvoiceSortFieldInput.Comment,
  invoiceNumber: InvoiceSortFieldInput.InvoiceNumber,
  status: InvoiceSortFieldInput.Status,
};

export const mapStatus = (patch: RecordPatch<PrescriptionRowFragment>) => {
  switch (patch.status) {
    case InvoiceNodeStatus.Picked:
      return UpdatePrescriptionStatusInput.Picked;
    case InvoiceNodeStatus.Verified:
      return UpdatePrescriptionStatusInput.Verified;
    default:
      return undefined;
  }
};
