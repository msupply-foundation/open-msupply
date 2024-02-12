import { useQuery, useTableStore } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundRows } from './useInboundRows';

export const useNewSupplierReturnLines = () => {
  const api = useInboundApi();

  const { items, lines } = useInboundRows();

  const selectedIds =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })?.map(({ id }) => id) || [];

  return useQuery(api.keys.newReturns(selectedIds), () =>
    api.get.newSupplierReturnLines(selectedIds)
  );
};
