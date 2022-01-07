import { useMemo } from 'react';
import {
  SupplierRequisitionNodeStatus,
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
import { Requisition, RequisitionLine } from '../../types';
import { SupplierRequisitionApi } from './api';

export const useSupplierRequisition = (): UseQueryResult<Requisition> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  return useQuery(['requisition', id], () =>
    SupplierRequisitionApi.get.byId(api)(id)
  );
};

export const useSupplierRequisitionFields = <
  KeyOfRequisition extends keyof Requisition
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<Requisition, KeyOfRequisition> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  return useFieldsSelector(
    ['requisition', id],
    () => SupplierRequisitionApi.get.byId(api)(id),
    (patch: Partial<Requisition>) =>
      SupplierRequisitionApi.update(api)({ ...patch, id }),
    keys
  );
};

interface UseSupplierRequisitionLinesController
  extends SortController<RequisitionLine>,
    PaginationState {
  lines: RequisitionLine[];
}

export const useSupplierRequisitionLines =
  (): UseSupplierRequisitionLinesController => {
    const { sortBy, onChangeSortBy } = useSortBy<RequisitionLine>({
      key: 'itemName',
      isDesc: false,
    });
    const pagination = usePagination(20);
    const { lines } = useSupplierRequisitionFields('lines');

    const sorted = useMemo(() => {
      const sorted =
        lines?.sort(
          getDataSorter(sortBy.key as keyof RequisitionLine, !!sortBy.isDesc)
        ) ?? [];

      return sorted.slice(
        pagination.offset,
        pagination.first + pagination.offset
      );
    }, [sortBy, lines, pagination]);

    return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
  };

export const useIsSupplierRequisitionDisabled = (): boolean => {
  const { status } = useSupplierRequisitionFields('status');
  return status === SupplierRequisitionNodeStatus.Finalised;
};
