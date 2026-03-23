import { InvoiceTypeInput, useMutation } from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST } from './keys';
import { PrescriptionRowFragment } from '../operations.generated';

// This hook kept separate, as it can be used from either the List page or the
// Detail page, which use different hooks (usePrescriptionList and
// usePrescription, respectively)
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
    const result = await prescriptionApi.deleteInvoices({
      storeId,
      ids: invoices.map(invoice => ({ id: invoice.id })),
      type: [InvoiceTypeInput.Prescription],
    });

    const deletedIds = result?.deleteInvoices?.deleteInvoices;
    if (deletedIds) {
      return deletedIds.map(({ id }) => id);
    }

    throw new Error('Could not delete invoices');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([LIST]),
  });
};
