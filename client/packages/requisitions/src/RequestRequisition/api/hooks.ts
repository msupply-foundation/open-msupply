import { isRequestDisabled } from './../../utils';
import { useEffect, useMemo } from 'react';
import {
  zustand,
  useConfirmationModal,
  useAuthContext,
  useTranslation,
  useQueryParams,
  useQueryClient,
  useNavigate,
  useMutation,
  useParams,
  useGql,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortUtils,
  useNotification,
  useTableStore,
  RequisitionNodeStatus,
  RegexUtils,
  SortBy,
} from '@openmsupply-client/common';
import { MasterListRowFragment } from '@openmsupply-client/system';
import { getRequestQueries, ListParams } from './api';
import {
  getSdk,
  RequestFragment,
  RequestRowFragment,
} from './operations.generated';
import { useRequestColumns } from '../DetailView/columns';

export const useHideOverStocked = zustand<{
  on: boolean;
  toggle: () => void;
}>(set => ({
  toggle: () => set(state => ({ ...state, on: !state.on })),
  on: false,
}));

export const useRequestApi = () => {
  const keys = {
    base: () => ['request'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<RequestRowFragment>) =>
      [...keys.list(), sortBy] as const,
    chartData: (lineId: string) => [...keys.base(), storeId, lineId] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getRequestQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};

export const useRequests = (options?: { enabled: boolean }) => {
  const queryParams = useQueryParams<RequestRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useRequestApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams),
      () =>
        api.get.list({
          first: queryParams.first,
          offset: queryParams.offset,
          sortBy: queryParams.sortBy,
          filterBy: queryParams.filter.filterBy,
        }),
      options
    ),
    ...queryParams,
  };
};

export const useRequestsAll = (sortBy: SortBy<RequestRowFragment>) => {
  const api = useRequestApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), () =>
      api.get.listAll({ sortBy })
    ),
  };
};

const useRequestNumber = () => {
  const { requisitionNumber = '' } = useParams();
  return requisitionNumber;
};

export const useInsertRequest = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestApi();
  return useMutation(api.insert, {
    onSuccess: ({ requisitionNumber }) => {
      navigate(String(requisitionNumber));
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};

export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};

export const useRequest = (): UseQueryResult<RequestFragment> => {
  const requestNumber = useRequestNumber();
  const api = useRequestApi();
  return useQuery(
    api.keys.detail(requestNumber),
    () => api.get.byNumber(requestNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};

export const useRequestFields = <
  KeyOfRequisition extends keyof RequestFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestFragment, KeyOfRequisition> => {
  const { data } = useRequest();
  const requestNumber = useRequestNumber();
  const api = useRequestApi();
  return useFieldsSelector(
    api.keys.detail(requestNumber),
    () => api.get.byNumber(requestNumber),

    (patch: Partial<RequestFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

export const useRequestLineChartData = (requisitionLineId: string) => {
  const api = useRequestApi();
  return useQuery(
    api.keys.chartData(requisitionLineId),
    () => api.get.lineChartData(requisitionLineId),
    {
      refetchOnMount: false,
      cacheTime: 0,
      onError: () => {},
    }
  );
};

export const useItemFilter = zustand<{
  itemFilter: string;
  setItemFilter: (itemFilter: string) => void;
}>(set => ({
  setItemFilter: (itemFilter: string) =>
    set(state => ({ ...state, itemFilter })),
  itemFilter: '',
}));

export const useRequestLines = () => {
  const { on } = useHideOverStocked();
  const { itemFilter, setItemFilter } = useItemFilter();
  const { columns, onChangeSortBy, sortBy } = useRequestColumns();
  const { lines, minMonthsOfStock } = useRequestFields([
    'lines',
    'minMonthsOfStock',
  ]);

  useEffect(() => {
    setItemFilter('');
  }, []);

  const sorted = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    const { getSortValue } = currentColumn ?? {};
    const sorted = getSortValue
      ? lines?.nodes.sort(
          SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
        )
      : lines?.nodes;

    if (on) {
      return sorted.filter(
        item =>
          item.itemStats.availableStockOnHand <
            item.itemStats.averageMonthlyConsumption * minMonthsOfStock &&
          RegexUtils.includes(itemFilter, item.item.name)
      );
    } else {
      return sorted.filter(({ item: { name } }) =>
        RegexUtils.includes(itemFilter, name)
      );
    }
  }, [sortBy.key, sortBy.isDesc, lines, on, minMonthsOfStock, itemFilter]);

  return {
    lines: sorted,
    sortBy,
    onChangeSortBy,
    columns,
    itemFilter,
    setItemFilter,
  };
};

export const useIsRequestDisabled = (): boolean => {
  const { data } = useRequest();
  if (!data) return true;
  return isRequestDisabled(data);
};

export const useSaveRequestLines = () => {
  const requestNumber = useRequestNumber();
  const queryClient = useQueryClient();
  const api = useRequestApi();

  return useMutation(api.upsertLine, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(requestNumber));
    },
  });
};

export const useDeleteRequests = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  return useMutation(api.deleteRequests, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};

export const useDeleteSelectedRequisitions = () => {
  const { data: rows } = useRequests({ enabled: false });
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
      const canDeleteRows = selectedRows.every(
        ({ status }) => status === RequisitionNodeStatus.Draft
      );
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-requisitions'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows);
        const deletedMessage = t('messages.deleted-requisitions', {
          count: numberSelected,
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

export const useAddFromMasterList = () => {
  const { error } = useNotification();
  const queryClient = useQueryClient();
  const { id: requestId, requisitionNumber } = useRequestFields([
    'id',
    'requisitionNumber',
  ]);
  const api = useRequestApi();
  const mutationState = useMutation(api.addFromMasterList, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(String(requisitionNumber))),
  });

  const t = useTranslation('distribution');
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-add-from-master-list'),
  });

  const addFromMasterList = async ({
    id: masterListId,
  }: MasterListRowFragment) => {
    getConfirmation({
      onConfirm: () =>
        mutationState.mutate(
          { masterListId, requestId },
          {
            onError: e => {
              const { message } = e as Error;
              switch (message) {
                case 'CannotEditRequisition': {
                  return error('Cannot edit requisition')();
                }
                case 'RecordNotFound': {
                  return error('This master list has been deleted!')();
                }
                case 'MasterListNotFoundForThisStore': {
                  return error(
                    "Uh oh this is not the master list you're looking for"
                  )();
                }
                default:
                  return error('Could not add items to requisition')();
              }
            },
          }
        ),
    });
  };

  return { ...mutationState, addFromMasterList };
};

export const useDeleteRequestLines = () => {
  const { success, info } = useNotification();
  const { lines } = useRequestLines();
  const api = useRequestApi();
  const requestNumber = useRequestNumber();
  const isDisabled = useIsRequestDisabled();
  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  const t = useTranslation('distribution');

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    if (isDisabled) {
      info(t('label.cant-delete-disabled-requisition'))();
      return;
    }
    const number = selectedRows?.length;
    if (selectedRows && number) {
      mutate(selectedRows, {
        onSuccess: success(t('messages.deleted-lines', { number: number })),
      });
    } else {
      info(t('label.select-rows-to-delete-them'))();
    }
  };

  return { onDelete };
};

export const useSuggestedQuantity = () => {
  const queryClient = useQueryClient();
  const api = useRequestApi();
  const requestNumber = useRequestNumber();
  const { id } = useRequestFields('id');

  return useMutation(() => api.useSuggestedQuantity(id), {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
};
