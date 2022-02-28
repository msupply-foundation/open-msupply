import { useMemo } from 'react';
import {
  useAuthContext,
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
  const { store } = useAuthContext();
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
  const { storeId } = useAuthContext();
  const navigate = useNavigate();
  const api = useRequestRequisitionApi();
  return useMutation(RequestRequisitionQueries.create(api, storeId), {
    onSuccess: ({ requisitionNumber }) => {
      navigate(String(requisitionNumber));
      queryClient.invalidateQueries(['requisition']);
    },
  });
};

export const useRequestRequisition =
  (): UseQueryResult<RequestRequisitionFragment> => {
    const { requisitionNumber = '' } = useParams();
    const { storeId } = useAuthContext();
    const api = useRequestRequisitionApi();
    return useQuery(['requisition', storeId, requisitionNumber], () =>
      RequestRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        storeId
      )
    );
  };

export const useRequestRequisitionFields = <
  KeyOfRequisition extends keyof RequestRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestRequisitionFragment, KeyOfRequisition> => {
  const { storeId } = useAuthContext();
  const { data } = useRequestRequisition();
  const { requisitionNumber = '' } = useParams();
  const api = useRequestRequisitionApi();
  return useFieldsSelector(
    ['requisition', storeId, requisitionNumber],
    () =>
      RequestRequisitionQueries.get.byNumber(api)(
        Number(requisitionNumber),
        storeId
      ),
    (patch: Partial<RequestRequisitionFragment>) =>
      RequestRequisitionQueries.update(
        api,
        storeId
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
  const { storeId } = useAuthContext();
  const queryClient = useQueryClient();
  const api = useRequestRequisitionApi();

  return useMutation(RequestRequisitionQueries.upsertLine(api, storeId), {
    onSuccess: () => {
      queryClient.invalidateQueries([
        'requisition',
        storeId,
        requisitionNumber,
      ]);
    },
  });
};
