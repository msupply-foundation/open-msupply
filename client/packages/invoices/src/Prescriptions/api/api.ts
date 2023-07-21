import { FilterBy, SortBy } from '@common/hooks';
import {
  InsertPrescriptionMutationVariables,
  PrescriptionRowFragment,
  Sdk,
} from './operations.generated';
import {
  InvoiceNodeStatus,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  RecordPatch,
  UpdatePrescriptionInput,
  UpdatePrescriptionStatusInput,
} from '@common/types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<PrescriptionRowFragment>;
  filterBy: FilterBy | null;
};

const prescriptionParsers = {
  toSortField: (
    sortBy: SortBy<PrescriptionRowFragment>
  ): InvoiceSortFieldInput => {
    switch (sortBy.key) {
      case 'createdDatetime': {
        return InvoiceSortFieldInput.CreatedDatetime;
      }
      case 'otherPartyName': {
        return InvoiceSortFieldInput.OtherPartyName;
      }
      case 'comment': {
        return InvoiceSortFieldInput.Comment;
      }
      case 'invoiceNumber': {
        return InvoiceSortFieldInput.InvoiceNumber;
      }
      case 'status':
      default: {
        return InvoiceSortFieldInput.Status;
      }
    }
  },
  toStatus: (patch: RecordPatch<PrescriptionRowFragment>) => {
    switch (patch.status) {
      case InvoiceNodeStatus.Picked:
        return UpdatePrescriptionStatusInput.Picked;
      case InvoiceNodeStatus.Verified:
        return UpdatePrescriptionStatusInput.Verified;
      default:
        return undefined;
    }
  },
  toInsert: (
    patch: Omit<InsertPrescriptionMutationVariables, 'storeId'>,
    storeId: string
  ): InsertPrescriptionMutationVariables => ({
    id: patch.id,
    patientId: patch.patientId,
    storeId,
  }),
  toUpdate: (
    patch: RecordPatch<PrescriptionRowFragment>
  ): UpdatePrescriptionInput => ({
    id: patch.id,
    patientId: patch.otherPartyId,
    colour: patch.colour,
    comment: patch.comment,
    status: prescriptionParsers.toStatus(patch),
  }),
};

export const getPrescriptionQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    list: async ({
      first,
      offset,
      sortBy,
      filterBy,
    }: ListParams): Promise<{
      nodes: PrescriptionRowFragment[];
      totalCount: number;
    }> => {
      const filter = {
        ...filterBy,
        type: { equalTo: InvoiceNodeType.Prescription },
      };
      const result = await sdk.invoices({
        first,
        offset,
        key: prescriptionParsers.toSortField(sortBy),
        desc: !!sortBy.isDesc,
        filter,
        storeId,
      });
      return result?.invoices;
    },
    byNumber: async (
      invoiceNumber: string
    ): Promise<PrescriptionRowFragment> => {
      const result = await sdk.prescriptionByNumber({
        invoiceNumber: Number(invoiceNumber),
        storeId,
      });
      const invoice = result?.invoiceByNumber;

      if (invoice?.__typename === 'InvoiceNode') {
        return invoice;
      } else {
        throw new Error('Could not find invoice');
      }
    },
  },
  insert: async (
    invoice: Omit<InsertPrescriptionMutationVariables, 'storeId'>
  ): Promise<number> => {
    const result =
      (await sdk.insertPrescription({
        id: invoice.id,
        patientId: invoice.patientId,
        storeId,
      })) || {};

    const { insertPrescription } = result;

    if (insertPrescription?.__typename === 'InvoiceNode') {
      return insertPrescription.invoiceNumber;
    }

    throw new Error('Could not insert invoice');
  },
  update: async (patch: RecordPatch<PrescriptionRowFragment>) => {
    const result =
      (await sdk.upsertPrescription({
        storeId,
        input: {
          updatePrescriptions: [prescriptionParsers.toUpdate(patch)],
        },
      })) || {};

    const { batchPrescription } = result;

    if (batchPrescription?.__typename === 'BatchPrescriptionResponse') {
      return batchPrescription;
    }

    throw new Error('Unable to update invoice');
  },
  delete: async (invoices: PrescriptionRowFragment[]): Promise<string[]> => {
    const result =
      (await sdk.deletePrescriptions({
        storeId,
        deletePrescriptions: invoices.map(invoice => invoice.id),
      })) || {};

    const { batchPrescription } = result;
    if (batchPrescription?.deletePrescriptions) {
      return batchPrescription.deletePrescriptions.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  },
});
