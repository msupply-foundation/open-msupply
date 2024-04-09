import { useTableStore } from '@openmsupply-client/common';
import { useOutboundRows } from '../line/useOutboundRows';
import { isString } from 'lodash';

export const useSelectedIds = () => {
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
      ?.map(({ id }) => id)
      .filter(isString) || [];

  return selectedIds;
};
