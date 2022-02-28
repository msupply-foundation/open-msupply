import { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  useNotification,
  useQuerySelector,
  StocktakeNodeStatus,
  useQueryClient,
  useParams,
  useOmSupplyApi,
  useMutation,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  groupBy,
  getColumnSorter,
  useSortBy,
  useAuthContext,
  useQueryParams,
  useTableStore,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../types';
import { StocktakeApi, getStocktakeQueries } from './api';
import { useStocktakeColumns } from '../DetailView';
import {
  getSdk,
  StocktakeFragment,
  StocktakeRowFragment,
  StocktakeLineFragment,
} from './operations.generated';

export const useStocktakeApi = (): StocktakeApi => {
  const { client } = useOmSupplyApi();
  const { storeId } = useAuthContext();
  const queries = getStocktakeQueries(getSdk(client), storeId);
  return { ...queries, storeId };
};

export const useStocktake = (): UseQueryResult<StocktakeFragment> => {
  const { stocktakeNumber = '' } = useParams();
  const api = useStocktakeApi();
  return useQuery(['stocktake', stocktakeNumber], () =>
    api.get.byNumber(Number(stocktakeNumber))
  );
};

export const useStocktakes = () => {
  const queryParams = useQueryParams<StocktakeRowFragment>({
    initialSortBy: { key: 'createdDatetime' },
  });
  const api = useStocktakeApi();

  return {
    ...useQuery(
      ['stocktake', api.storeId, queryParams],
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

export const useInsertStocktake = () => {
  const navigate = useNavigate();
  const api = useStocktakeApi();
  return useMutation(api.insertStocktake, {
    onSuccess: ({ stocktakeNumber }) => {
      navigate(String(stocktakeNumber));
    },
  });
};

export const useStocktakeFields = <
  KeyOfStocktake extends keyof StocktakeFragment
>(
  keys: KeyOfStocktake | KeyOfStocktake[]
): FieldSelectorControl<StocktakeFragment, KeyOfStocktake> => {
  const { stocktakeNumber = '' } = useParams();
  const { data } = useStocktake();
  const api = useStocktakeApi();
  return useFieldsSelector(
    ['stocktake', stocktakeNumber],
    () => api.get.byNumber(Number(stocktakeNumber)),
    (patch: Partial<StocktakeFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

export const useIsStocktakeDisabled = (): boolean => {
  const { status } = useStocktakeFields('status');
  return status === StocktakeNodeStatus.Finalised;
};

import { useCallback } from 'react';

export const useStocktakeDetailQueryKey = (): ['stocktake', string] => {
  const { stocktakeNumber = '' } = useParams();
  return ['stocktake', stocktakeNumber];
};

const useStocktakeSelector = <ReturnType>(
  select: (data: StocktakeFragment) => ReturnType
) => {
  const queryKey = useStocktakeDetailQueryKey();
  const api = useStocktakeApi();
  return useQuerySelector(
    queryKey,
    () => api.get.byNumber(Number(queryKey[1])),
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

    return Object.entries(groupBy(lines.nodes, 'itemId')).map(
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
  const queryKey = useStocktakeDetailQueryKey();
  const queryClient = useQueryClient();
  const api = useStocktakeApi();
  return useMutation(api.updateLines, {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
    },
  });
};

export const useDeleteStocktakeLine = () => {
  const api = useStocktakeApi();
  return useMutation(api.deleteLines);
};

export const useDeleteSelectedLines = (): {
  onDelete: () => Promise<void>;
} => {
  const queryKey = useStocktakeDetailQueryKey();
  const { success, info } = useNotification();
  const queryClient = useQueryClient();
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
      mutate(selectedRows, {
        onSuccess: () => {
          queryClient.invalidateQueries(queryKey);
          successSnack();
        },
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
    const sorter = getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return items?.sort(sorter);
  }, [items, sortBy.key, sortBy.isDesc]);

  const sortedLines = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    if (!currentColumn?.getSortValue) return lines;
    const sorter = getColumnSorter(
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
