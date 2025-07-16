import { useEffect } from 'react';
import { useTableStore } from '@openmsupply-client/common';
import { DraftStockOutLineFragment } from './StockOut';

type RowsType = DraftStockOutLineFragment | DraftStockOutLineFragment;

export const useDisableVvmRows = (rows: RowsType[]): void => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows
      ?.filter(row => row.vvmStatus?.unusable)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
