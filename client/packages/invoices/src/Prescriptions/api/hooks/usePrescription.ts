import {
  ArrayUtils,
  RecordPatch,
  SortUtils,
  UpdatePrescriptionInput,
  useMutation,
  useParams,
  useQuery,
  useUrlQueryParams,
  usePatchState,
  setNullableInput,
} from '@openmsupply-client/common';
import {
  InsertPrescriptionMutationVariables,
  PrescriptionRowFragment,
} from '../operations.generated';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { PRESCRIPTION, PRESCRIPTION_LINE } from './keys';
import { isPrescriptionDisabled } from '@openmsupply-client/invoices/src/utils';
import { mapStatus } from './utils';
import { useDelete } from './usePrescriptionDelete';
import { useMemo } from 'react';
import { usePrescriptionColumn } from '../../DetailView/columns';

export const usePrescriptionNumber = () => {
  const { invoiceNumber } = useParams();
  const asNumber = Number(invoiceNumber);
  return Number.isNaN(asNumber) ? undefined : asNumber;
};

export const usePrescription = (id?: string) => {
  const invoiceNumber = usePrescriptionNumber();
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const columns = usePrescriptionColumn({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  // If an id is passed in (which is the case when accessing from JSON Forms
  // Prescription component), we use that and fetch by ID. Otherwise we use the
  // invoice number from the URL
  const invoiceNum = !id ? invoiceNumber : undefined;

  // QUERY
  const {
    data: dataByNum,
    isLoading,
    error: errorByNum,
    isFetchedAfterMount: isFetchedAfterMountByNum,
  } = useGetByNumber(invoiceNum);
  const {
    data: dataById,
    isLoading: loadingById,
    error: errorById,
    isFetchedAfterMount: isFetchedAfterMountById,
  } = useGetById(id);

  const data = id ? dataById : dataByNum;
  const loading = id ? loadingById : isLoading;
  const error = id ? errorById : errorByNum;
  const isDisabled = data ? isPrescriptionDisabled(data) : false;
  const isFetchedAfterMount = id
    ? isFetchedAfterMountById
    : isFetchedAfterMountByNum;

  const rows = useMemo(() => {
    const stockLines = data?.lines?.nodes;
    const items = Object.entries(
      ArrayUtils.groupBy(stockLines, line => line.item.id)
    ).map(([itemId, lines]) => {
      return { id: itemId, itemId, lines };
    });
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return [...(items ?? [])].sort(sorter);
  }, [data, sortBy.key, sortBy.isDesc]);

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

  const create = async (
    invoice: Omit<InsertPrescriptionMutationVariables, 'storeId'>
  ) => {
    const result = await createMutation(invoice);
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
    query: {
      data,
      loading,
      error,
      isFetchedAfterMount,
    },
    isDisabled,
    update: { update, isUpdating, updateError },
    create: { create, isCreating, createError },
    delete: { deletePrescription, isDeleting, deleteError },
    isDirty,
    updatePatch,
    rows,
  };
};

const useGetByNumber = (invoiceNum: number | undefined) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const queryFn = async (): Promise<PrescriptionRowFragment> => {
    const result = await prescriptionApi.prescriptionByNumber({
      invoiceNumber: invoiceNum ?? -1,
      storeId,
    });

    const invoice = result?.invoiceByNumber;

    if (invoice?.__typename === 'InvoiceNode') {
      return invoice;
    } else {
      throw new Error('Could not find invoice');
    }
  };

  const query = useQuery({
    queryKey: [PRESCRIPTION, PRESCRIPTION_LINE, invoiceNum],
    queryFn,
    enabled: !!invoiceNum && invoiceNum > 0,
  });

  return query;
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
    }
    // Don't throw error for this one if not found -- it's mainly used by
    // Program component (Prescription), which may have stored an id for a
    // prescription that doesn't yet exist
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
    onSuccess: () => {
      queryClient.invalidateQueries([PRESCRIPTION]);
    },
  });
};

const useCreate = () => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const mutationFn = async (
    invoice: Omit<InsertPrescriptionMutationVariables, 'storeId'>
  ): Promise<number> => {
    const result =
      (await prescriptionApi.insertPrescription({
        id: invoice.id,
        patientId: invoice.patientId,
        storeId,
      })) || {};

    const { insertPrescription } = result;

    if (insertPrescription?.__typename === 'InvoiceNode') {
      return insertPrescription.invoiceNumber;
    }

    throw new Error('Could not insert invoice');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([PRESCRIPTION]),
  });
};
