import {
  FilterBy,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST, PRESCRIPTION } from './keys';
import { PrescriptionHistoryRowFragment } from '../operations.generated';
import { sortFieldMap } from './utils';

export type HistoryListParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PrescriptionHistoryRowFragment>;
  filterBy: FilterBy | null;
};

const HISTORY = 'history';

export const usePrescriptionHistoryList = (
  queryParams?: HistoryListParams
) => {
  const { prescriptionApi, storeId } = usePrescriptionGraphQL();

  const {
    sortBy = {
      key: 'pickedDatetime',
      direction: 'desc',
    },
    first,
    offset,
    filterBy,
  } = queryParams ?? {};

  const queryKey = [
    LIST,
    PRESCRIPTION,
    HISTORY,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: PrescriptionHistoryRowFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      type: { equalTo: InvoiceNodeType.Prescription },
    };

    const sortKey = (sortFieldMap[sortBy.key] ||
      InvoiceSortFieldInput.PickedDatetime) as InvoiceSortFieldInput;

    const query = await prescriptionApi.prescriptionHistory({
      storeId,
      first,
      offset,
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
  });

  return {
    query: { data, isLoading, isFetching, isError },
  };
};
