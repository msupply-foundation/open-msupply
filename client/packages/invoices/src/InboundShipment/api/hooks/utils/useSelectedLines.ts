import { useTableStore } from '@openmsupply-client/common';
import { useInboundRows } from '../line/useInboundRows';

export const useSelectedLines = () => {
  const { items, lines } = useInboundRows();

  const selectedLines = useTableStore(state => {
    const { isGrouped } = state;

    return isGrouped
      ? items
          ?.filter(({ id }) => state.rowState[id]?.isSelected)
          .map(({ lines }) => lines.flat())
          .flat()
      : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
  });

  return selectedLines ?? [];
};
