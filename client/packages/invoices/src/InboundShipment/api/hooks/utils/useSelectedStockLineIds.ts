import { useTableStore } from '@openmsupply-client/common';
import { useInboundRows } from '../line/useInboundRows';
import { isString } from 'lodash';

export const useSelectedStockLineIds = () => {
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
    })
      ?.map(({ stockLine }) => stockLine?.id)
      .filter(isString) || [];

  return selectedIds;
};
