import { useMemo } from 'react';
import {
  useAuthState,
  useQueryParams,
  useQueryClient,
  RequisitionNodeStatus,
  useNavigate,
  useMutation,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortController,
  useSortBy,
  getDataSorter,
  useHostContext,
} from '@openmsupply-client/common';
import { RequestRequisitionQueries } from './api';
import {
  getSdk,
  RequestRequisitionFragment,
  RequestRequisitionLineFragment,
  RequestRequisitionRowFragment,
} from './operations.generated';

export const useRequestRequisitionApi = () => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};

export const useRequestRequisitions = () => {
  const queryParams = useQueryParams<RequestRequisitionRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const { store } = useAuthState();
  const api = useRequestRequisitionApi();

  return {
    ...useQuery(
      ['requisition', store?.id, queryParams],
      RequestRequisitionQueries.get.list(api, store?.id ?? '', {
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filter: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useCreateRequestRequisition = () => {
  const queryClient = useQueryClient();
  const { store } = useHostContext();
  const navigate = useNavigate();
  const api = useRequestRequisitionApi();
  return useMutation(RequestRequisitionQueries.create(api, store.id), {
    onSuccess: ({ requisitionNumber }) => {
      navigate(String(requisitionNumber));
      queryClient.invalidateQueries(['requisition']);
    },
  });
};

export const useRequestRequisition =
  (): UseQueryResult<RequestRequisitionFragment> => {
    const { requisitionNumber = '' } = useParams();
    const { store } = useHostContext();
    const api = useRequestRequisitionApi();
    return useQuery(['requisition', store.id, requisitionNumber], () =>
      RequestRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        store.id
      )
    );
  };

export const useRequestRequisitionFields = <
  KeyOfRequisition extends keyof RequestRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestRequisitionFragment, KeyOfRequisition> => {
  const { store } = useHostContext();
  const { data } = useRequestRequisition();
  const { requisitionNumber = '' } = useParams();
  const api = useRequestRequisitionApi();
  return useFieldsSelector(
    ['requisition', store.id, requisitionNumber],
    () =>
      RequestRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        store.id
      ),
    (patch: Partial<RequestRequisitionFragment>) =>
      RequestRequisitionQueries.update(
        api,
        store.id
      )({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

interface UseRequestRequisitionLinesController
  extends SortController<RequestRequisitionLineFragment> {
  lines: RequestRequisitionLineFragment[];
}

export const useRequestRequisitionLines =
  (): UseRequestRequisitionLinesController => {
    const { sortBy, onChangeSortBy } =
      useSortBy<RequestRequisitionLineFragment>({
        key: 'itemName',
        isDesc: false,
      });

    const { lines } = useRequestRequisitionFields('lines');

    const sorted = useMemo(() => {
      return (
        lines?.nodes.sort(
          getDataSorter(
            sortBy.key as keyof RequestRequisitionLineFragment,
            !!sortBy.isDesc
          )
        ) ?? []
      );
    }, [sortBy, lines]);

    return { lines: sorted, sortBy, onChangeSortBy };
  };

export const useIsRequestRequisitionDisabled = (): boolean => {
  const { status } = useRequestRequisitionFields('status');
  return (
    status === RequisitionNodeStatus.Finalised ||
    status === RequisitionNodeStatus.Sent
  );
};

export const useSaveRequestLines = () => {
  const { requisitionNumber = '' } = useParams();
  const { store } = useHostContext();
  const queryClient = useQueryClient();
  const api = useRequestRequisitionApi();

  return useMutation(RequestRequisitionQueries.upsertLine(api, store.id), {
    onSuccess: () => {
      queryClient.invalidateQueries([
        'requisition',
        store.id,
        requisitionNumber,
      ]);
    },
  });
};
