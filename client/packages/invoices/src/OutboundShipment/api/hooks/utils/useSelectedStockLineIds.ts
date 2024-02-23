import { useTableStore } from '@openmsupply-client/common';
import { useOutboundRows } from '../line/useOutboundRows';
import { isString } from 'lodash';

export const useSelectedStockLineIds = () => {
  const { items, lines } = useOutboundRows();

  const selectedIds =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .flatMap(({ lines }) => lines.flat())
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    })
      ?.map(({ stockLine }) => stockLine?.id)
      .filter(isString) || [];

  return selectedIds;
};
