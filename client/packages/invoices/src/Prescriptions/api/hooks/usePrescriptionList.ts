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

export type ListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PrescriptionRowFragment>;
  filterBy: FilterBy | null;
};

export const usePrescriptionList = (queryParams?: ListParams) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const {
    sortBy = {
      key: 'invoiceNumber',
      direction: 'asc',
    },
    first,
    offset,
    filterBy,
  } = queryParams ?? {};

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

    const sortKey = (sortFieldMap[sortBy.key] ||
      InvoiceSortFieldInput.InvoiceNumber) as InvoiceSortFieldInput;

    const query = await prescriptionApi.prescriptions({
      storeId,
      first: first,
      offset: offset,
      key: sortKey,
      desc: sortBy.direction === 'desc',
      filter,
    });
    const { nodes, totalCount } = query?.invoices;
    return { nodes, totalCount };
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey,
    queryFn,
    keepPreviousData: true,
  });

  return {
    query: { data, isLoading, isFetching, isError },
  };
};
