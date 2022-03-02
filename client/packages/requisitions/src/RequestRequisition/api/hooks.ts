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
  RequestRequisitionFragment,
  RequestRequisitionLineFragment,
  RequestRequisitionRowFragment,
} from './operations.generated';
import { canDeleteRequestRequisition } from '../../utils';

export const useRequestApi = () => {
  const { client } = useOmSupplyApi();
  const { storeId } = useAuthContext();
  const queries = getRequestQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useRequestRequisitions = () => {
  const queryParams = useQueryParams<RequestRequisitionRowFragment>({
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

export const useCreateRequestRequisition = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestApi();
  return useMutation(api.create, {
    onSuccess: ({ requisitionNumber }) => {
      navigate(String(requisitionNumber));
      queryClient.invalidateQueries(['requisition']);
    },
  });
};

export const useUpdateRequestRequisition = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(['requisition']),
  });
};

export const useRequestRequisition =
  (): UseQueryResult<RequestRequisitionFragment> => {
    const { requisitionNumber = '' } = useParams();
    const api = useRequestApi();
    return useQuery(['requisition', api.storeId, requisitionNumber], () =>
      api.get.byNumber(requisitionNumber)
    );
  };

export const useRequestRequisitionFields = <
  KeyOfRequisition extends keyof RequestRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestRequisitionFragment, KeyOfRequisition> => {
  const { data } = useRequestRequisition();
  const { requisitionNumber = '' } = useParams();
  const api = useRequestApi();
  return useFieldsSelector(
    ['requisition', api.storeId, requisitionNumber],
    () => api.get.byNumber(requisitionNumber),

    (patch: Partial<RequestRequisitionFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
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

export const useDeleteRequisitions = () => {
  const api = useRequestApi();
  return useMutation(api.deleteRequisitions);
};

export const useDeleteSelectedRequisitions = () => {
  const queryClient = useQueryClient();
  const { data: rows } = useRequestRequisitions();
  const { mutate } = useDeleteRequisitions();
  const t = useTranslation('replenishment');

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as RequestRequisitionRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteRequestRequisition);
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
