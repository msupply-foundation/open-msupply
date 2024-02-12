import { useQuery, useTableStore } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundRows } from './useInboundRows';

export const useNewSupplierReturnLines = () => {
  const api = useInboundApi();

  const { items, lines } = useInboundRows();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  // TODO: also show please select lines
  if (!selectedRows.length) {
  }

  const lineIds = selectedRows.map(({ id }) => id);

  return useQuery(api.keys.newReturns(lineIds), () =>
    api.get.newSupplierReturnLines(lineIds)
  );
};
