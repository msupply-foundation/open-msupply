import { useQueryClient } from 'react-query';
import { useMemo } from 'react';
import {
  useAuthState,
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
  useMutation,
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
  const { store } = useAuthState();

  return { ...getSdk(client), store, storeId: store?.id ?? '' };
};

export const useResponseRequisitions = () => {
  const queryParams = useQueryParams<ResponseRequisitionRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });

  const api = useResponseRequisitionApi();

  return {
    ...useQuery(
      ['requisition', api.storeId, queryParams],
      ResponseRequisitionQueries.get.list(api, api.storeId, {
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
    const api = useResponseRequisitionApi();
    return useQuery(['requisition', api.storeId, requisitionNumber], () =>
      ResponseRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        api.storeId
      )
    );
  };

export const useResponseRequisitionFields = <
  KeyOfRequisition extends keyof ResponseRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseRequisitionFragment, KeyOfRequisition> => {
  const { data } = useResponseRequisition();
  const { requisitionNumber = '' } = useParams();
  const api = useResponseRequisitionApi();
  return useFieldsSelector(
    ['requisition', api.storeId, requisitionNumber],
    () =>
      ResponseRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        api.storeId
      ),
    (patch: Partial<ResponseRequisitionFragment>) =>
      ResponseRequisitionQueries.update(
        api,
        api.storeId
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

export const useSaveResponseLines = () => {
  const { requisitionNumber = '' } = useParams();
  const queryClient = useQueryClient();
  const api = useResponseRequisitionApi();

  return useMutation(ResponseRequisitionQueries.updateLine(api, api.storeId), {
    onSuccess: () =>
      queryClient.invalidateQueries([
        'requisition',
        api.storeId,
        requisitionNumber,
      ]),
  });
};
