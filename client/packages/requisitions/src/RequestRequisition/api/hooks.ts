import { useMemo } from 'react';
import {
  useAuthContext,
  useTranslation,
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
  useNotification,
  useTableStore,
} from '@openmsupply-client/common';
import { getRequestQueries } from './api';
import {
  getSdk,
  RequestFragment,
  RequestLineFragment,
  RequestRowFragment,
} from './operations.generated';
import { canDeleteRequest } from '../../utils';

export const useRequestApi = () => {
  const { client } = useOmSupplyApi();
  const { storeId } = useAuthContext();
  const queries = getRequestQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useRequests = () => {
  const queryParams = useQueryParams<RequestRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useRequestApi();

  return {
    ...useQuery(['requisition', 'list', api.storeId, queryParams], () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filterBy: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useInsertRequest = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestApi();
  return useMutation(api.insert, {
    onSuccess: ({ requisitionNumber }) => {
      navigate(String(requisitionNumber));
      queryClient.invalidateQueries(['requisition']);
    },
  });
};

export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(['requisition']),
  });
};

export const useRequest = (): UseQueryResult<RequestFragment> => {
  const { requisitionNumber = '' } = useParams();
  const api = useRequestApi();
  return useQuery(['requisition', api.storeId, requisitionNumber], () =>
    api.get.byNumber(requisitionNumber)
  );
};

export const useRequestFields = <
  KeyOfRequisition extends keyof RequestFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestFragment, KeyOfRequisition> => {
  const { data } = useRequest();
  const { requisitionNumber = '' } = useParams();
  const api = useRequestApi();
  return useFieldsSelector(
    ['requisition', api.storeId, requisitionNumber],
    () => api.get.byNumber(requisitionNumber),

    (patch: Partial<RequestFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

interface UseRequestRequisitionLinesController
  extends SortController<RequestLineFragment> {
  lines: RequestLineFragment[];
}

export const useRequestLines = (): UseRequestRequisitionLinesController => {
  const { sortBy, onChangeSortBy } = useSortBy<RequestLineFragment>({
    key: 'itemName',
    isDesc: false,
  });

  const { lines } = useRequestFields('lines');

  const sorted = useMemo(() => {
    return (
      lines?.nodes.sort(
        getDataSorter(sortBy.key as keyof RequestLineFragment, !!sortBy.isDesc)
      ) ?? []
    );
  }, [sortBy, lines]);

  return { lines: sorted, sortBy, onChangeSortBy };
};

export const useIsRequestDisabled = (): boolean => {
  const { status } = useRequestFields('status');
  return (
    status === RequisitionNodeStatus.Finalised ||
    status === RequisitionNodeStatus.Sent
  );
};

export const useSaveRequestLines = () => {
  const { requisitionNumber = '' } = useParams();
  const queryClient = useQueryClient();
  const api = useRequestApi();

  return useMutation(api.upsertLine, {
    onSuccess: () => {
      queryClient.invalidateQueries([
        'requisition',
        api.storeId,
        requisitionNumber,
      ]);
    },
  });
};

export const useDeleteRequests = () => {
  const api = useRequestApi();
  return useMutation(api.deleteRequests);
};

export const useDeleteSelectedRequisitions = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useRequests();
  const { mutate } = useDeleteRequests();
  const t = useTranslation('replenishment');

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as RequestRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteRequest);
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-requisitions'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows, {
          onSuccess: () =>
            queryClient.invalidateQueries(['requisition', 'list']),
        });
        const deletedMessage = t('messages.deleted-requisitions', {
          number: numberSelected,
        });
        const successSnack = success(deletedMessage);
        successSnack();
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return deleteAction;
};
