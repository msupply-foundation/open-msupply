import {
  RecordPatch,
  UpdatePrescriptionInput,
  useMutation,
  useParams,
  useQuery,
  usePatchState,
  setNullableInput,
  InsertPrescriptionInput,
  InvoiceNode,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../operations.generated';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';
import { isPrescriptionDisabled } from '@openmsupply-client/invoices/src/utils';
import { mapStatus } from './utils';
import { useDelete } from './usePrescriptionDelete';
import { useMemo } from 'react';

export const usePrescriptionId = () => {
  const { invoiceId = '' } = useParams();
  return invoiceId;
};

export const usePrescription = (id?: string) => {
  const paramInvoiceId = usePrescriptionId();

  // If an id is passed in (which is the case when accessing from JSON Forms
  // Prescription component), we use that and fetch by ID. Otherwise we use the
  // invoice id from the URL
  const invoiceId = !id ? paramInvoiceId : id;

  const { data, isLoading: loading, error } = useGetById(invoiceId);

  const isDisabled = data ? isPrescriptionDisabled(data) : false;

  const rows = useMemo(() => {
    const stockLines = data?.lines?.nodes ?? [];
    return stockLines;
  }, [data]);

  // UPDATE
  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<PrescriptionRowFragment>(data ?? {});

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate(data?.id ?? '');

  const update = async (newData?: Partial<PrescriptionRowFragment>) => {
    if (!data?.id) return;
    // Data can be passed directly to the update method, or if omitted will use
    // the current patch data
    if (newData) await updateMutation({ ...newData, id: data.id });
    else await updateMutation({ ...patch, id: data.id });
    resetDraft();
  };

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (input: InsertPrescriptionInput) => {
    const result = await createMutation(input);
    resetDraft();
    return result;
  };

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useDelete();

  const deletePrescription = async () => {
    if (!data) return;
    const result = await deleteMutation([data]);
    resetDraft();
    return result;
  };

  return {
    query: { data, loading, error },
    isDisabled,
    update: { update, isUpdating, updateError },
    create: { create, isCreating, createError },
    delete: { deletePrescription, isDeleting, deleteError },
    isDirty,
    updatePatch,
    rows,
  };
};

const useGetById = (invoiceId: string | undefined) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const queryFn = async (): Promise<PrescriptionRowFragment | void> => {
    const result = await prescriptionApi.prescriptionById({
      invoiceId: invoiceId ?? '',
      storeId,
    });

    const invoice = result?.invoice;

    if (invoice?.__typename === 'InvoiceNode') {
      return invoice;
    } else {
      console.error('No invoice found', invoiceId);
      throw new Error(`Could not find invoice ${invoiceId}`);
    }
  };

  const query = useQuery({
    queryKey: [PRESCRIPTION, PRESCRIPTION_LINE, invoiceId],
    queryFn,
    enabled: !!invoiceId,
  });

  return query;
};

const useUpdate = (id: string) => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const mutationFn = async (patch: RecordPatch<PrescriptionRowFragment>) => {
    const input: UpdatePrescriptionInput = {
      ...patch,
      id,
      status: mapStatus(patch),
      clinicianId: setNullableInput('clinicianId', patch),
      diagnosisId: setNullableInput('diagnosisId', patch),
      programId: setNullableInput('programId', patch),
      theirReference: setNullableInput('theirReference', patch),
      nameInsuranceJoinId: setNullableInput('nameInsuranceJoinId', patch),
    };
    const result =
      (await prescriptionApi.upsertPrescription({
        storeId,
        input: {
          updatePrescriptions: [input],
        },
      })) || {};

    const { batchPrescription } = result;

    if (batchPrescription?.__typename === 'BatchPrescriptionResponse') {
      return batchPrescription;
    }

    throw new Error('Unable to update invoice');
  };

  return useMutation({
    mutationFn,
    onSuccess: (_result, patch) => {
      // Keep cached prescription in sync immediately, to avoid a window where a
      // newly-cancelled prescription is still editable before refetch completes.
      queryClient.setQueryData<PrescriptionRowFragment | undefined>(
        [PRESCRIPTION, PRESCRIPTION_LINE, id],
        (current: PrescriptionRowFragment | undefined) => {
          if (!current) return current;

          const cleanedPatch = Object.fromEntries(
            Object.entries(patch).filter(([, value]) => value !== undefined)
          ) as Partial<PrescriptionRowFragment>;

          return { ...current, ...cleanedPatch };
        }
      );
      queryClient.invalidateQueries([PRESCRIPTION]);
    },
  });
};

const useCreate = () => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const mutationFn = async (
    input: InsertPrescriptionInput
  ): Promise<Partial<InvoiceNode>> => {
    const result =
      (await prescriptionApi.insertPrescription({
        input,
        storeId,
      })) || {};

    const { insertPrescription } = result;

    if (insertPrescription?.__typename === 'InvoiceNode') {
      return insertPrescription;
    }

    throw new Error('Could not insert invoice');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([PRESCRIPTION]),
  });
};
