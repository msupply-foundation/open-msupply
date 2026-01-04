import {
  DeletePrescriptionLineInput,
  InsertPrescriptionLineInput,
  InvoiceLineNodeType,
  RecordPatch,
  setNullableInput,
  SetPrescribedQuantityInput,
  UpdatePrescriptionLineInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePrescription } from './usePrescription';
import { DraftPrescriptionLine } from '@openmsupply-client/invoices/src/types';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import {
  PrescriptionLineFragment,
  PrescriptionRowFragment,
} from '../operations.generated';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';
import { createInputObject, mapStatus } from './utils';
import { HISTORICAL_STOCK_LINES } from '@openmsupply-client/system/src/Item/api/keys';

// Hook to manage prescription lines. Only has "save" and "delete"
// functionality, as the query is done as part of the full prescription query
// (usePrescription).
//
// We don't manage draft state in here, as there is a lot of complex logic
// associated with it, which is handled by the `useDraftPrescriptionLines` hook.

export const usePrescriptionLines = (id?: string) => {
  const {
    query: { data },
  } = usePrescription(id);

  // SAVE LINES
  const {
    mutateAsync: updateMutation,
    isLoading: isSavingLines,
    error: saveLineError,
  } = useSaveLines(data?.id ?? '', data?.id ?? '');

  const saveLines = async ({
    draftPrescriptionLines,
    patch,
  }: {
    draftPrescriptionLines: DraftPrescriptionLine[];
    patch?: RecordPatch<PrescriptionRowFragment>;
  }) => {
    return await updateMutation({
      draftPrescriptionLines,
      patch,
    });
  };

  // DELETE LINES
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeletingLines,
    error: deleteLinesError,
  } = useDeleteLines(data?.id ?? '');

  const deleteLines = async (rowsToDelete: PrescriptionLineFragment[]) => {
    const lines = rowsToDelete.map(({ id }) => ({ id }));
    await deleteMutation(lines);
  };

  return {
    save: { saveLines, isSavingLines, saveLineError },
    delete: { deleteLines, isDeletingLines, deleteLinesError },
  };
};

const useSaveLines = (id: string, invoiceId: string) => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const mutationFn = async ({
    draftPrescriptionLines,
    patch,
  }: {
    draftPrescriptionLines: DraftPrescriptionLine[];
    patch?: RecordPatch<PrescriptionRowFragment>;
  }) => {
    if (patch && id !== '') patch.id = id;
    const input = {
      insertPrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, numberOfPacks }) =>
            isCreated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks >= 0
        )
        .map(
          line =>
            createInputObject(line, 'insert') as InsertPrescriptionLineInput
        ),
      updatePrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks >= 0
        )
        .map(
          line =>
            createInputObject(line, 'update') as UpdatePrescriptionLineInput
        ),
      deletePrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks === 0
        )
        .map(
          line =>
            createInputObject(line, 'delete') as DeletePrescriptionLineInput
        ),
      updatePrescriptions: !!patch
        ? [
            {
              ...patch,
              status: mapStatus(patch),
              clinicianId: setNullableInput('clinicianId', patch),
              diagnosisId: setNullableInput('diagnosisId', patch),
              programId: setNullableInput('programId', patch),
              theirReference: setNullableInput('theirReference', patch),
              nameInsuranceJoinId: setNullableInput(
                'nameInsuranceJoinId',
                patch
              ),
            },
          ]
        : undefined,
      setPrescribedQuantity: draftPrescriptionLines
        .filter(
          ({ invoiceId, item, prescribedQuantity }) =>
            invoiceId && item && (prescribedQuantity ?? 0) > 0
        )
        .map(
          line =>
            createInputObject(
              line,
              'setPrescribedQuantity'
            ) as SetPrescribedQuantityInput
        ),
    };

    const result = await prescriptionApi.upsertPrescription({ storeId, input });

    return result;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([
        PRESCRIPTION,
        PRESCRIPTION_LINE,
        invoiceId,
      ]);
      queryClient.invalidateQueries([HISTORICAL_STOCK_LINES]);
    },
  });
};

const useDeleteLines = (invocieId: string) => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const toDeleteLine = (line: { id: string }): DeletePrescriptionLineInput => ({
    id: line.id,
  });

  const mutationFn = async (lines: { id: string }[]) => {
    return prescriptionApi.deletePrescriptionLines({
      storeId,
      deletePrescriptionLines: lines.map(toDeleteLine),
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([
        PRESCRIPTION,
        PRESCRIPTION_LINE,
        invocieId,
      ]);
      queryClient.invalidateQueries([HISTORICAL_STOCK_LINES]);
    },
  });
};
