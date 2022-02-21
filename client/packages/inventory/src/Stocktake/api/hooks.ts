import { useMemo } from 'react';
import {
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
  useHostContext,
} from '@openmsupply-client/common';
import { StocktakeSummaryItem } from '../../types';
import { StocktakeQueries, StocktakeApi } from './api';
import { useStocktakeColumns } from '../DetailView/columns';
import {
  getSdk,
  StocktakeFragment,
  StocktakeLineFragment,
} from './operations.generated';

export const useStocktakeApi = (): StocktakeApi => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};

export const useStocktake = (): UseQueryResult<StocktakeFragment> => {
  const { id = '' } = useParams();
  const { store } = useHostContext();
  const api = useStocktakeApi();
  return useQuery(['stocktake', id], () =>
    StocktakeQueries.get.byId(api, store.id)(id)
  );
};

export const useStocktakeFields = <
  KeyOfStocktake extends keyof StocktakeFragment
>(
  keys: KeyOfStocktake | KeyOfStocktake[]
): FieldSelectorControl<StocktakeFragment, KeyOfStocktake> => {
  const { id = '' } = useParams();
  const { store } = useHostContext();
  const api = useStocktakeApi();
  return useFieldsSelector(
    ['stocktake', id],
    () => StocktakeQueries.get.byId(api, store.id)(id),
    (patch: Partial<StocktakeFragment>) =>
      StocktakeQueries.update(api, store.id)({ ...patch, id }),
    keys
  );
};

export const useIsStocktakeDisabled = (): boolean => {
  const { status } = useStocktakeFields('status');
  return status === StocktakeNodeStatus.Finalised;
};

import { useCallback } from 'react';

export const useStocktakeDetailQueryKey = (): ['stocktake', string] => {
  const { id = '' } = useParams();
  return ['stocktake', id];
};

const useStocktakeSelector = <ReturnType>(
  select: (data: StocktakeFragment) => ReturnType
) => {
  const queryKey = useStocktakeDetailQueryKey();
  const { store } = useHostContext();
  const api = useStocktakeApi();
  return useQuerySelector(
    queryKey,
    () => StocktakeQueries.get.byId(api, store.id)(queryKey[1]),
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
        return { id: itemId, itemId, lines };
      }
    );
  }, []);

  return useStocktakeSelector(selectLines);
};

export const useSaveStocktakeLines = () => {
  const queryKey = useStocktakeDetailQueryKey();
  const queryClient = useQueryClient();
  const { store } = useHostContext();
  const api = useStocktakeApi();
  return useMutation(StocktakeQueries.updateLines(api, store.id), {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
    },
  });
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
