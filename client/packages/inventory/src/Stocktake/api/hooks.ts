import {
  useQuerySelector,
  StocktakeNodeStatus,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  // SortController,
  // PaginationState,
  groupBy,
  // uniqBy,
  // useSortBy,
  // usePagination,
  // getDataSorter,
} from '@openmsupply-client/common';
import { Stocktake, StocktakeLine, StocktakeSummaryItem } from '../../types';
import { StocktakeApi } from './api';

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

// interface UseStocktakeLineController
//   extends SortController<StocktakeLine>,
//     PaginationState {
//   lines: StocktakeLine[];
// }

// export const useStocktakeLines = (): UseStocktakeLineController => {
//   const { sortBy, onChangeSortBy } = useSortBy<StocktakeLine>({
//     key: 'itemName',
//     isDesc: false,
//   });
//   const pagination = usePagination(20);
//   const { lines } = useStocktakeFields('lines');

//   const sorted = useMemo(() => {
//     const sorted = [...(lines ?? [])].sort(
//       getDataSorter(sortBy.key as keyof StocktakeLine, !!sortBy.isDesc)
//     );

//     return sorted.slice(
//       pagination.offset,
//       pagination.first + pagination.offset
//     );
//   }, [sortBy, lines, pagination]);

//   return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
// };

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
      console.log('select lines');
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

export const useStocktakeItems = (): StocktakeSummaryItem[] => {
  const { data } = useStocktakeLines();
  const buildSummaryItems = (stocktakeLines: StocktakeLine[]) => {
    return Object.entries(groupBy(stocktakeLines, 'itemId')).map(
      ([itemId, lines]) => {
        return { id: itemId, itemId, lines };
      }
    );
  };
  const items = data ? buildSummaryItems(data) : [];
  return items;
};
