import { useMemo } from 'react';
import {
  useAuthContext,
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
  useQueryParams,
} from '@openmsupply-client/common';
import { ResponseRequisitionQueries } from './api';
import {
  getSdk,
  ResponseRequisitionFragment,
  ResponseRequisitionLineFragment,
  ResponseRequisitionRowFragment,
} from './operations.generated';

export const useResponseRequisitionApi = () => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};

export const useResponseRequisitions = () => {
  const queryParams = useQueryParams<ResponseRequisitionRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const { storeId } = useAuthContext();
  const api = useResponseRequisitionApi();

  return {
    ...useQuery(
      ['requisition', storeId, queryParams],
      ResponseRequisitionQueries.get.list(api, storeId, {
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filter: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useResponseRequisition =
  (): UseQueryResult<ResponseRequisitionFragment> => {
    const { requisitionNumber = '' } = useParams();
    const { storeId } = useAuthContext();
    const api = useResponseRequisitionApi();
    return useQuery(['requisition', requisitionNumber], () =>
      ResponseRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        storeId
      )
    );
  };

export const useResponseRequisitionFields = <
  KeyOfRequisition extends keyof ResponseRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseRequisitionFragment, KeyOfRequisition> => {
  const { storeId } = useAuthContext();
  const { data } = useResponseRequisition();
  const { requisitionNumber = '' } = useParams();
  const api = useResponseRequisitionApi();
  return useFieldsSelector(
    ['requisition', requisitionNumber],
    () =>
      ResponseRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        storeId
      ),
    (patch: Partial<ResponseRequisitionFragment>) =>
      ResponseRequisitionQueries.update(
        api,
        storeId
      )({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

interface UseResponseRequisitionLinesController
  extends SortController<ResponseRequisitionLineFragment>,
    PaginationState {
  lines: ResponseRequisitionLineFragment[];
}

export const useResponseRequisitionLines =
  (): UseResponseRequisitionLinesController => {
    const { sortBy, onChangeSortBy } =
      useSortBy<ResponseRequisitionLineFragment>({
        key: 'itemName',
        isDesc: false,
      });
    const pagination = usePagination(20);
    const { lines } = useResponseRequisitionFields('lines');

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

export const useIsResponseRequisitionDisabled = (): boolean => {
  const { status } = useResponseRequisitionFields('status');
  return status === RequisitionNodeStatus.Finalised;
};
