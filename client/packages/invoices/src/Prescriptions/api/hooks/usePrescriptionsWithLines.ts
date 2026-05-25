import {
  FilterBy,
  InvoiceNodeType,
  InvoiceSortFieldInput,
  SortBy,
  useQuery,
} from '@openmsupply-client/common';
import { usePrescriptionGraphQL } from '../usePrescriptionGraphQL';
import { LIST, PRESCRIPTION } from './keys';
import { PrescriptionWithLinesFragment } from '../operations.generated';
import { sortFieldMap } from './utils';

export type PrescriptionsWithLinesParams = {
  first?: number;
  offset?: number;
  sortBy?: SortBy<PrescriptionWithLinesFragment>;
  filterBy: FilterBy | null;
};

const WITH_LINES = 'with-lines';

export const usePrescriptionsWithLines = (
  queryParams?: PrescriptionsWithLinesParams
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
    WITH_LINES,
    storeId,
    sortBy,
    first,
    offset,
    filterBy,
  ];

  const queryFn = async (): Promise<{
    nodes: PrescriptionWithLinesFragment[];
    totalCount: number;
  }> => {
    const filter = {
      ...filterBy,
      type: { equalTo: InvoiceNodeType.Prescription },
    };

    const sortKey = (sortFieldMap[sortBy.key] ||
      InvoiceSortFieldInput.PickedDatetime) as InvoiceSortFieldInput;

    const query = await prescriptionApi.prescriptionsWithLines({
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
