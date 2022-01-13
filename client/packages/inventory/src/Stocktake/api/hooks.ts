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
} from '@openmsupply-client/common';
import { Stocktake, StocktakeLine, StocktakeSummaryItem } from '../../types';
import { StocktakeApi } from './api';
import { useStocktakeColumns } from '../DetailView/columns';

export const useStocktake = (): UseQueryResult<Stocktake> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  return useQuery(['requisition', id], () => StocktakeApi.get.byId(api)(id));
};

export const useStocktakeFields = <KeyOfStocktake extends keyof Stocktake>(
  keys: KeyOfStocktake | KeyOfStocktake[]
): FieldSelectorControl<Stocktake, KeyOfStocktake> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  return useFieldsSelector(
    ['requisition', id],
    () => StocktakeApi.get.byId(api)(id),
    (patch: Partial<Stocktake>) => StocktakeApi.update(api)({ ...patch, id }),
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
  select: (data: Stocktake) => ReturnType
) => {
  const queryKey = useStocktakeDetailQueryKey();
  const { api } = useOmSupplyApi();
  return useQuerySelector(
    queryKey,
    () => StocktakeApi.get.byId(api)(queryKey[1]),
    select
  );
};

export const useStocktakeLines = (
  itemId?: string
): UseQueryResult<StocktakeLine[], unknown> => {
  const selectLines = useCallback(
    (stocktake: Stocktake) => {
      return itemId
        ? stocktake.lines.filter(
            ({ itemId: stocktakeLineItemId }) => itemId === stocktakeLineItemId
          )
        : stocktake.lines;
    },
    [itemId]
  );

  return useStocktakeSelector(selectLines);
};

export const useStocktakeItems = (): UseQueryResult<StocktakeSummaryItem[]> => {
  const selectLines = useCallback((stocktake: Stocktake) => {
    const { lines } = stocktake;

    return Object.entries(groupBy(lines, 'itemId')).map(([itemId, lines]) => {
      return { id: itemId, itemId, lines };
    });
  }, []);

  return useStocktakeSelector(selectLines);
};

export const useSaveStocktakeLines = () => {
  const queryKey = useStocktakeDetailQueryKey();
  const queryClient = useQueryClient();
  const { api } = useOmSupplyApi();
  return useMutation(StocktakeApi.updateLines(api), {
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
    },
  });
};

export const useStocktakeRows = (isGrouped = true) => {
  const { sortBy, onChangeSortBy } = useSortBy<
    StocktakeLine | StocktakeSummaryItem
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
    if (!currentColumn?.getSortValue) return items;
    const sorter = getColumnSorter(
      currentColumn?.getSortValue,
      !!sortBy.isDesc
    );
    return items?.sort(sorter);
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
