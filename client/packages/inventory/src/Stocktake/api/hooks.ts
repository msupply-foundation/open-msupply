import { isStocktakeDisabled } from './../../utils';
import { useMemo, useCallback } from 'react';
import {
  useNavigate,
  useTranslation,
  useNotification,
  useQuerySelector,
  useQueryClient,
  useParams,
  useGql,
  useMutation,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  ArrayUtils,
  SortUtils,
  useSortBy,
  useAuthContext,
  useQueryParams,
  useTableStore,
  SortBy,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../types';
import { getStocktakeQueries, ListParams } from './api';
import { useStocktakeColumns } from '../DetailView';
import { canDeleteStocktake } from '../../utils';
import {
  getSdk,
  StocktakeFragment,
  StocktakeRowFragment,
  StocktakeLineFragment,
} from './operations.generated';

export const useStocktakeApi = () => {
  const keys = {
    base: () => ['stocktake'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
    sortedList: (sortBy: SortBy<StocktakeRowFragment>) =>
      [...keys.list(), sortBy] as const,
  };

  const { client } = useGql();
  const { storeId } = useAuthContext();
  const queries = getStocktakeQueries(getSdk(client), storeId);
  return { ...queries, storeId, keys };
};

const useStocktakeNumber = () => {
  const { stocktakeNumber = '' } = useParams();
  return stocktakeNumber;
};

export const useStocktake = (): UseQueryResult<StocktakeFragment> => {
  const stocktakeNumber = useStocktakeNumber();
  const api = useStocktakeApi();
  return useQuery(
    api.keys.detail(stocktakeNumber),
    () => api.get.byNumber(stocktakeNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
  );
};

export const useStocktakes = () => {
  const queryParams = useQueryParams<StocktakeRowFragment>({
    initialSortBy: { key: 'createdDatetime' },
  });
  const api = useStocktakeApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams),
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
export const useStocktakesAll = (sortBy: SortBy<StocktakeRowFragment>) => {
  const api = useStocktakeApi();

  return {
    ...useMutation(api.keys.sortedList(sortBy), api.get.listAll({ sortBy })),
  };
};

export const useInsertStocktake = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useStocktakeApi();
  return useMutation<
    { __typename: 'StocktakeNode'; id: string; stocktakeNumber: number },
    unknown,
    string[] | undefined,
    unknown
  >((itemIds?: string[]) => api.insertStocktake(itemIds), {
    onSuccess: ({ stocktakeNumber }) => {
      navigate(String(stocktakeNumber));
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};

export const useUpdateStocktake = () => {
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};

export const useStocktakeFields = <
  KeyOfStocktake extends keyof StocktakeFragment
>(
  keys: KeyOfStocktake | KeyOfStocktake[]
): FieldSelectorControl<StocktakeFragment, KeyOfStocktake> => {
  const stocktakeNumber = useStocktakeNumber();
  const { mutateAsync } = useUpdateStocktake();
  const { data } = useStocktake();
  const api = useStocktakeApi();
  return useFieldsSelector(
    api.keys.detail(stocktakeNumber),
    () => api.get.byNumber(stocktakeNumber),
    (patch: Partial<StocktakeFragment>) =>
      mutateAsync({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

export const useIsStocktakeDisabled = (): boolean => {
  const { data } = useStocktake();
  if (!data) return true;
  return isStocktakeDisabled(data);
};

const useStocktakeSelector = <ReturnType>(
  select: (data: StocktakeFragment) => ReturnType
) => {
  const stocktakeNumber = useStocktakeNumber();

  const api = useStocktakeApi();
  return useQuerySelector(
    api.keys.detail(stocktakeNumber),
    () => api.get.byNumber(stocktakeNumber),
    select
  );
};

export const useStocktakeLines = (
  itemId?: string
): UseQueryResult<StocktakeLineFragment[], unknown> => {
  const selectLines = useCallback(
    (stocktake: StocktakeFragment) => {
      return itemId
        ? stocktake.lines.nodes.filter(
            ({ itemId: stocktakeLineItemId }) => itemId === stocktakeLineItemId
          )
        : stocktake.lines.nodes;
    },
    [itemId]
  );

  return useStocktakeSelector(selectLines);
};

export const useStocktakeItems = (): UseQueryResult<StocktakeSummaryItem[]> => {
  const selectLines = useCallback((stocktake: StocktakeFragment) => {
    const { lines } = stocktake;

    return Object.entries(ArrayUtils.groupBy(lines.nodes, 'itemId')).map(
      ([itemId, lines]) => {
        return {
          id: itemId,
          item: lines[0].item,
          lines,
        };
      }
    );
  }, []);

  return useStocktakeSelector(selectLines);
};

export const useSaveStocktakeLines = () => {
  const stocktakeNumber = useStocktakeNumber();
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  return useMutation(api.updateLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktakeNumber)),
  });
};

export const useDeleteStocktakeLine = () => {
  const queryClient = useQueryClient();
  const stocktakeNumber = useStocktakeNumber();

  const api = useStocktakeApi();
  return useMutation(api.deleteLines, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(stocktakeNumber)),
  });
};

export const useDeleteSelectedLines = (): { onDelete: () => Promise<void> } => {
  const { success, info } = useNotification();
  const { items, lines } = useStocktakeRows();
  const { mutate } = useDeleteStocktakeLine();
  const t = useTranslation('inventory');

  const { selectedRows } = useTableStore(state => {
    const { isGrouped } = state;

    if (isGrouped) {
      return {
        selectedRows: (
          Object.keys(state.rowState)
            .filter(id => state.rowState[id]?.isSelected)
            .map(selectedId => items?.find(({ id }) => selectedId === id))
            .filter(Boolean) as StocktakeSummaryItem[]
        )
          .map(({ lines }) => lines)
          .flat(),
      };
    } else {
      return {
        selectedRows: Object.keys(state.rowState)
          .filter(id => state.rowState[id]?.isSelected)
          .map(selectedId => lines?.find(({ id }) => selectedId === id))
          .filter(Boolean) as StocktakeLineFragment[],
      };
    }
  });

  const onDelete = async () => {
    if (selectedRows && selectedRows?.length > 0) {
      const number = selectedRows?.length;
      const successSnack = success(t('messages.deleted-lines', { number }));
      await mutate(selectedRows, {
        onSuccess: successSnack,
      });
    } else {
      const infoSnack = info(t('label.select-rows-to-delete-them'));
      infoSnack();
    }
  };

  return { onDelete };
};

export const useStocktakeRows = (isGrouped = true) => {
  const { sortBy, onChangeSortBy } = useSortBy<
    StocktakeLineFragment | StocktakeSummaryItem
  >({
    key: 'itemName',
  });
  const { data: lines } = useStocktakeLines();
  const { data: items } = useStocktakeItems();
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });

  const sortedItems = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return items;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return items?.sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = SortUtils.getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return lines?.sort(sorter);
  }, [lines, sortBy.key, sortBy.isDesc]);

  const rows = isGrouped ? sortedItems : sortedLines;

  return {
    rows,
    lines: sortedLines,
    items: sortedItems,
    onChangeSortBy,
    sortBy,
  };
};

export const useDeleteStocktakes = () => {
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  return useMutation(api.deleteStocktakes, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};

export const useDeleteSelectedStocktakes = () => {
  const t = useTranslation('inventory');
  const { data: rows } = useStocktakes();
  const { success, info } = useNotification();
  const { mutate } = useDeleteStocktakes();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as StocktakeRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteStocktake);
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-stocktakes'));
        cannotDeleteSnack();
      } else {
        const deletedMessage = t('messages.deleted-stocktakes', {
          number: numberSelected,
        });
        const successSnack = success(deletedMessage);
        mutate(selectedRows, { onSuccess: successSnack });
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  return deleteAction;
};
