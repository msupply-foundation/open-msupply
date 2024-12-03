import { useMutation } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST } from './keys';
import { PrescriptionRowFragment } from '../operations.generated';

export const usePrescriptionDelete = () => {
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useDelete();

  const deletePrescriptions = async (invoices: PrescriptionRowFragment[]) => {
    return await deleteMutation(invoices);
  };

  return { deletePrescriptions, isDeleting, deleteError };
};

export const useDelete = () => {
  const { prescriptionApi, storeId, queryClient } = usePrescriptionGraphQL();

  const mutationFn = async (
    invoices: PrescriptionRowFragment[]
  ): Promise<string[]> => {
    const result =
      (await prescriptionApi.deletePrescriptions({
        storeId,
        deletePrescriptions: invoices.map(invoice => invoice.id),
      })) || {};

    const { batchPrescription } = result;
    if (batchPrescription?.deletePrescriptions) {
      return batchPrescription.deletePrescriptions.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([LIST]),
  });
};
