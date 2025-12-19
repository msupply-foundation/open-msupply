import {
  FilterBy,
  InvoiceSortFieldInput,
  useQuery,
} from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST, PRESCRIPTION } from './keys';
import { PrescriptionRowFragment } from '../operations.generated';

export const useExportPrescriptionList = (filterBy: FilterBy | null) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const queryKey = [LIST, PRESCRIPTION, storeId, filterBy];

  const queryFn = async (): Promise<{
    nodes: PrescriptionRowFragment[];
    totalCount: number;
  }> => {
    const result = await prescriptionApi.prescriptions({
      key: InvoiceSortFieldInput.CreatedDatetime,
      desc: false,
      storeId,
      filter: { ...filterBy },
    });
    return result?.invoices;
  };

  const { data, refetch, isLoading, isError } = useQuery({
    queryKey,
    queryFn,
    enabled: false,
  });
  return { data, fetchPrescription: refetch, isLoading, isError };
};
