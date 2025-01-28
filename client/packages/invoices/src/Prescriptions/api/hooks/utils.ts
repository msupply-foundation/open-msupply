import {
  InvoiceNodeStatus,
  InvoiceSortFieldInput,
  RecordPatch,
  UpdatePrescriptionStatusInput,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../operations.generated';
import { DraftStockOutLine } from 'packages/invoices/src/types';

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

export const createInputObject = (
  line: DraftStockOutLine,
  type: 'insert' | 'update' | 'delete'
) => {
  const { id, numberOfPacks, prescribedQuantity, stockLine, invoiceId, note } =
    line;

  const stockLineId = stockLine?.id ?? '';
  const output = { id, numberOfPacks, stockLineId, note };

  switch (type) {
    case 'delete':
      return { id };
    case 'update':
      return { ...output, prescribedQuantity };
    case 'insert':
      return { ...output, invoiceId };
  }
};
