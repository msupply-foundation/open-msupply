import { useMemo } from 'react';
import {
  RequisitionNodeStatus,
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
import { CustomerRequisitionApi } from './api';

export const useCustomerRequisition = (): UseQueryResult<Requisition> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  return useQuery(['requisition', id], () =>
    CustomerRequisitionApi.get.byId(api)(id)
  );
};

export const useCustomerRequisitionFields = <
  KeyOfRequisition extends keyof Requisition
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<Requisition, KeyOfRequisition> => {
  const { id = '' } = useParams();
  const { api } = useOmSupplyApi();
  return useFieldsSelector(
    ['requisition', id],
    () => CustomerRequisitionApi.get.byId(api)(id),
    (patch: Partial<Requisition>) =>
      CustomerRequisitionApi.update(api)({ ...patch, id }),
    keys
  );
};

interface UseCustomerRequisitionLinesController
  extends SortController<RequisitionLine>,
    PaginationState {
  lines: RequisitionLine[];
}

export const useCustomerRequisitionLines =
  (): UseCustomerRequisitionLinesController => {
    const { sortBy, onChangeSortBy } = useSortBy<RequisitionLine>({
      key: 'itemName',
      isDesc: false,
    });
    const pagination = usePagination(20);
    const { lines } = useCustomerRequisitionFields('lines');

    const sorted = useMemo(() => {
      const sorted = [...(lines ?? [])].sort(
        getDataSorter(sortBy.key as keyof RequisitionLine, !!sortBy.isDesc)
      );

      return sorted.slice(
        pagination.offset,
        pagination.first + pagination.offset
      );
    }, [sortBy, lines, pagination]);

    return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
  };

export const useIsCustomerRequisitionDisabled = (): boolean => {
  const { status } = useCustomerRequisitionFields('status');
  return status === RequisitionNodeStatus.Finalised;
};
