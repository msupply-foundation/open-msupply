import { useTableStore } from '@openmsupply-client/common';
import { useStocktakeRows } from '../line/useStocktakeRows';

export const useSelectedRows = () => {
  const { items, lines } = useStocktakeRows();
  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .flatMap(({ lines }) => lines)
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  return selectedRows;
};
