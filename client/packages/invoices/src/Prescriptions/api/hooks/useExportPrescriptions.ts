import {
  FilterBy,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST, PRESCRIPTION } from './keys';
import { PrescriptionRowFragment } from '../operations.generated';
import { sortFieldMap } from './utils';

export const useExportPrescriptionList = (
  filterBy: FilterBy | null,
  sortBy: SortBy<PrescriptionRowFragment>
) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const queryKey = [LIST, PRESCRIPTION, storeId, filterBy];

  const filter = {
    ...filterBy,
    type: { equalTo: InvoiceNodeType.Prescription },
  };

  const queryFn = async (): Promise<{
    nodes: PrescriptionRowFragment[];
    totalCount: number;
  }> => {
    const result = await prescriptionApi.prescriptions({
      key: sortFieldMap[sortBy.key] || InvoiceSortFieldInput.CreatedDatetime,
      desc: !!sortBy.isDesc,
      storeId,
      filter,
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
