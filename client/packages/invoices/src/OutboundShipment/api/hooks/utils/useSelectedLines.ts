import { useTableStore } from '@openmsupply-client/common';
import { useOutboundRows } from '../line/useOutboundRows';

export const useSelectedLines = () => {
  const { items, lines } = useOutboundRows();

  const selectedLines = useTableStore(state => {
    const { isGrouped } = state;

    return isGrouped
      ? items
          ?.filter(({ id }) => state.rowState[id]?.isSelected)
          .flatMap(({ lines }) => lines.flat())
      : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
  });

  return selectedLines ?? [];
};
