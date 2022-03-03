import { useMemo } from 'react';
import {
  useQueryClient,
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
  useMutation,
} from '@openmsupply-client/common';
import { getResponseQueries } from './api';
import {
  getSdk,
  ResponseFragment,
  ResponseLineFragment,
  ResponseRowFragment,
} from './operations.generated';

export const useResponseApi = () => {
  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getResponseQueries(sdk, storeId);

  return { ...queries, storeId };
};

export const useUpdateResponseRequisition = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(['requisition']),
  });
};

export const useResponseRequisitions = () => {
  const queryParams = useQueryParams<ResponseRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useResponseApi();

  return {
    ...useQuery(['requisition', api.storeId, queryParams], () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filter: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useResponseRequisition = (): UseQueryResult<ResponseFragment> => {
  const { requisitionNumber = '' } = useParams();
  const api = useResponseApi();
  return useQuery(['requisition', api.storeId, requisitionNumber], () =>
    api.get.byNumber(requisitionNumber)
  );
};

export const useResponseRequisitionFields = <
  KeyOfRequisition extends keyof ResponseFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseFragment, KeyOfRequisition> => {
  const { data } = useResponseRequisition();
  const { requisitionNumber = '' } = useParams();
  const api = useResponseApi();
  return useFieldsSelector(
    ['requisition', api.storeId, requisitionNumber],
    () => api.get.byNumber(requisitionNumber),
    (patch: Partial<ResponseFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

interface UseResponseRequisitionLinesController
  extends SortController<ResponseLineFragment>,
    PaginationState {
  lines: ResponseLineFragment[];
}

export const useResponseRequisitionLines =
  (): UseResponseRequisitionLinesController => {
    const { sortBy, onChangeSortBy } = useSortBy<ResponseLineFragment>({
      key: 'itemName',
      isDesc: false,
    });
    const pagination = usePagination(20);
    const { lines } = useResponseRequisitionFields('lines');

    const sorted = useMemo(() => {
      const sorted = [...(lines.nodes ?? [])].sort(
        getDataSorter(sortBy.key as keyof ResponseLineFragment, !!sortBy.isDesc)
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
  const api = useResponseApi();

  return useMutation(api.updateLine, {
    onSuccess: () =>
      queryClient.invalidateQueries([
        'requisition',
        api.storeId,
        requisitionNumber,
      ]),
  });
};
