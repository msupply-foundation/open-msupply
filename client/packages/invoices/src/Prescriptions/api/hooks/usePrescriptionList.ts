import {
  FilterByWithBoolean,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  SortBy,
  useQuery,
  useTableStore,
} from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST, PRESCRIPTION } from './keys';
import { PrescriptionRowFragment } from '../operations.generated';
import { sortFieldMap } from './utils';
import { useDelete } from './usePrescriptionDelete';

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PrescriptionRowFragment>;
  filterBy: FilterByWithBoolean | null;
};

export const usePrescriptionList = (queryParams: ListParams) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const {
    sortBy = {
      key: 'name',
      direction: 'asc',
    },
    first,
    offset,
    filterBy,
  } = queryParams;

  const queryKey = [
    LIST,
    PRESCRIPTION,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: PrescriptionRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      type: { equalTo: InvoiceNodeType.Prescription },
    };

    const query = await prescriptionApi.prescriptions({
      storeId,
      first: first,
      offset: offset,
      key: sortFieldMap[sortBy.key] ?? InvoiceSortFieldInput.Status,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.invoices;
    return { nodes, totalCount };
  };

  const { data, isLoading, isError } = useQuery({ queryKey, queryFn });

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as PrescriptionRowFragment[],
  }));

  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useDelete();

  const deletePrescriptions = async () => {
    await deleteMutation(selectedRows);
  };

  return {
    query: { data, isLoading, isError },
    delete: { deletePrescriptions, isDeleting, deleteError },
    selectedRows,
  };
};
