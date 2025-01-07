import { useTableStore } from '@openmsupply-client/common';
import { useStocktakeRows } from '../line/useStocktakeRows';

export const useSelectedRows = () => {
  const { lines } = useStocktakeRows();
  const selectedRows =
    useTableStore(state => {
      return lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  return selectedRows;
};
