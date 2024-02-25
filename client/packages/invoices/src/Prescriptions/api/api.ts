import { FilterByWithBoolean, SortBy } from '@common/hooks';
import {
  InsertPrescriptionMutationVariables,
  PrescriptionRowFragment,
  Sdk,
} from './operations.generated';
import {
  DeletePrescriptionLineInput,
  InsertPrescriptionLineInput,
  InvoiceLineNodeType,
  InvoiceNodeStatus,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  RecordPatch,
  UpdatePrescriptionInput,
  UpdatePrescriptionLineInput,
  UpdatePrescriptionStatusInput,
} from '@common/types';
import { DraftStockOutLine } from '../../types';

export type ListParams = {
  first: number;
  offset: number;
  sortBy: SortBy<PrescriptionRowFragment>;
  filterBy: FilterByWithBoolean | null;
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
    clinicianId: patch.clinicianId,
    patientId: patch.otherPartyId,
    colour: patch.colour,
    comment: patch.comment,
    status: prescriptionParsers.toStatus(patch),
  }),
  toInsertLine: (line: DraftStockOutLine): InsertPrescriptionLineInput => {
    return {
      id: line.id,
      itemId: line.item.id,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLine?.id ?? '',
      invoiceId: line.invoiceId,
      note: line.note ?? '',
    };
  },
  toUpdateLine: (line: DraftStockOutLine): UpdatePrescriptionLineInput => {
    return {
      id: line.id,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLine?.id ?? '',
      note: line.note ?? '',
    };
  },
  toDeleteLine: (line: { id: string }): DeletePrescriptionLineInput => ({
    id: line.id,
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
      const result = await sdk.prescriptions({
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
  updateLines: async ({
    draftPrescriptionLines,
    patch,
  }: {
    draftPrescriptionLines: DraftStockOutLine[];
    patch?: RecordPatch<PrescriptionRowFragment>;
  }) => {
    const input = {
      insertPrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, numberOfPacks }) =>
            isCreated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks > 0
        )
        .map(prescriptionParsers.toInsertLine),
      updatePrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks > 0
        )
        .map(prescriptionParsers.toUpdateLine),
      deletePrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks === 0
        )
        .map(prescriptionParsers.toDeleteLine),
      updatePrescriptions: !!patch
        ? [prescriptionParsers.toUpdate(patch)]
        : undefined,
    };

    const result = await sdk.upsertPrescription({ storeId, input });

    return result;
  },
  deleteLines: async (lines: { id: string }[]) => {
    return sdk.deletePrescriptionLines({
      storeId,
      deletePrescriptionLines: lines.map(prescriptionParsers.toDeleteLine),
    });
  },
});
