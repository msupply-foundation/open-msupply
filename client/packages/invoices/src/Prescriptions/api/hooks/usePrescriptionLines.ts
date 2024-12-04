import {
  DeletePrescriptionLineInput,
  InsertPrescriptionLineInput,
  InvoiceLineNodeType,
  RecordPatch,
  UpdatePrescriptionLineInput,
  useMutation,
} from '@openmsupply-client/common';
import { usePrescriptionSingle } from './usePrescriptionSingle';
import { DraftStockOutLine } from 'packages/invoices/src/types';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { PrescriptionRowFragment } from '../operations.generated';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';
import { mapStatus } from './hookUtils';

export const usePrescriptionLines = () => {
  const {
    query: { data },
  } = usePrescriptionSingle();

  // SAVE LINES
  const {
    mutateAsync: updateMutation,
    isLoading: isSavingLines,
    error: saveLineError,
  } = useSaveLines(data?.id ?? '', data?.invoiceNumber ?? -1);

  const saveLines = async ({
    draftPrescriptionLines,
    patch,
  }: {
    draftPrescriptionLines: DraftStockOutLine[];
    patch?: RecordPatch<PrescriptionRowFragment>;
  }) => {
    await updateMutation({
      draftPrescriptionLines,
      patch,
    });
  };
  // DELETE LINES

  return { save: { saveLines, isSavingLines, saveLineError } };
};

const useSaveLines = (id: string, invoiceNum: number) => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const toInsertLine = (
    line: DraftStockOutLine
  ): InsertPrescriptionLineInput => {
    return {
      id: line.id,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLine?.id ?? '',
      invoiceId: line.invoiceId,
      note: line.note ?? '',
    };
  };

  const toUpdateLine = (
    line: DraftStockOutLine
  ): UpdatePrescriptionLineInput => {
    return {
      id: line.id,
      numberOfPacks: line.numberOfPacks,
      stockLineId: line.stockLine?.id ?? '',
      note: line.note ?? '',
    };
  };

  const toDeleteLine = (line: { id: string }): DeletePrescriptionLineInput => ({
    id: line.id,
  });

  const mutationFn = async ({
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
        .map(toInsertLine),
      updatePrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks > 0
        )
        .map(toUpdateLine),
      deletePrescriptionLines: draftPrescriptionLines
        .filter(
          ({ type, isCreated, isUpdated, numberOfPacks }) =>
            !isCreated &&
            isUpdated &&
            type === InvoiceLineNodeType.StockOut &&
            numberOfPacks === 0
        )
        .map(toDeleteLine),
      updatePrescriptions: !!patch
        ? [
            {
              ...patch,
              id,
              status: mapStatus(patch),
            },
          ]
        : undefined,
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
        invoiceNum,
      ]);
    },
  });
};
