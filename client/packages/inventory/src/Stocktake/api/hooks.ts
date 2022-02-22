import { useNavigate } from 'react-router-dom';
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
  useQueryParams,
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
  const { store } = useHostContext();
  const queries = getStocktakeQueries(getSdk(client), store.id);
  return { ...queries, storeId: store.id };
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
