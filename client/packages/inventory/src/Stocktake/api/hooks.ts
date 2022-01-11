import { useMemo } from 'react';
import {
  StocktakeNodeStatus,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortController,
  PaginationState,
  useSortBy,
  usePagination,
  getDataSorter,
} from '@openmsupply-client/common';
import { Stocktake, StocktakeLine } from '../../types';
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

interface UseStocktakeLineController
  extends SortController<StocktakeLine>,
    PaginationState {
  lines: StocktakeLine[];
}

export const useStocktakeLines = (): UseStocktakeLineController => {
  const { sortBy, onChangeSortBy } = useSortBy<StocktakeLine>({
    key: 'itemName',
    isDesc: false,
  });
  const pagination = usePagination(20);
  const { lines } = useStocktakeFields('lines');

  const sorted = useMemo(() => {
    const sorted = [...(lines ?? [])].sort(
      getDataSorter(sortBy.key as keyof StocktakeLine, !!sortBy.isDesc)
    );

    return sorted.slice(
      pagination.offset,
      pagination.first + pagination.offset
    );
  }, [sortBy, lines, pagination]);

  return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
};

export const useIsStocktakeDisabled = (): boolean => {
  const { status } = useStocktakeFields('status');
  return status === StocktakeNodeStatus.Finalised;
};
