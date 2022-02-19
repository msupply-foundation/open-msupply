import { useMemo } from 'react';
import {
  useHostContext,
  RequisitionNodeStatus,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortController,
  PaginationState,
  useSortBy,
  usePagination,
  getDataSorter,
} from '@openmsupply-client/common';
import { ResponseRequisitionQueries } from './api';
import {
  getSdk,
  ResponseRequisitionFragment,
  ResponseRequisitionLineFragment,
} from './operations.generated';

export const useResponseRequisitionApi = () => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};

export const useCustomerRequisition =
  (): UseQueryResult<ResponseRequisitionFragment> => {
    const { id = '' } = useParams();
    const { store } = useHostContext();
    const api = useResponseRequisitionApi();
    return useQuery(['requisition', id], () =>
      ResponseRequisitionQueries.get.byNumber(api)(Number(id), store.id)
    );
  };

export const useCustomerRequisitionFields = <
  KeyOfRequisition extends keyof ResponseRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseRequisitionFragment, KeyOfRequisition> => {
  const { store } = useHostContext();
  const { id = '' } = useParams();
  const api = useResponseRequisitionApi();
  return useFieldsSelector(
    ['requisition', id],
    () => ResponseRequisitionQueries.get.byNumber(api)(Number(id), store.id),
    (patch: Partial<ResponseRequisitionFragment>) =>
      ResponseRequisitionQueries.update(api, store.id)({ ...patch, id }),
    keys
  );
};

interface UseCustomerRequisitionLinesController
  extends SortController<ResponseRequisitionLineFragment>,
    PaginationState {
  lines: ResponseRequisitionLineFragment[];
}

export const useCustomerRequisitionLines =
  (): UseCustomerRequisitionLinesController => {
    const { sortBy, onChangeSortBy } =
      useSortBy<ResponseRequisitionLineFragment>({
        key: 'itemName',
        isDesc: false,
      });
    const pagination = usePagination(20);
    const { lines } = useCustomerRequisitionFields('lines');

    const sorted = useMemo(() => {
      const sorted = [...(lines.nodes ?? [])].sort(
        getDataSorter(
          sortBy.key as keyof ResponseRequisitionLineFragment,
          !!sortBy.isDesc
        )
      );

      return sorted.slice(
        pagination.offset,
        pagination.first + pagination.offset
      );
    }, [sortBy, lines, pagination]);

    return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
  };

export const useIsCustomerRequisitionDisabled = (): boolean => {
  const { status } = useCustomerRequisitionFields('status');
  return status === RequisitionNodeStatus.Finalised;
};
