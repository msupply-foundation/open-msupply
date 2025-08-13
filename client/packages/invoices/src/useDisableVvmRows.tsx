import { useEffect } from 'react';
import { usePreferences, useTableStore } from '@openmsupply-client/common';
import { DraftStockOutLineFragment } from './StockOut';

type RowsType = DraftStockOutLineFragment | DraftStockOutLineFragment;

interface UseDisableVvmRowsProps {
  rows: RowsType[];
  isVaccine?: boolean;
}

export const useDisableVvmRows = ({
  rows,
  isVaccine,
}: UseDisableVvmRowsProps): void => {
  const { setDisabledRows } = useTableStore();
  const { manageVvmStatusForStock } = usePreferences();

  const shouldDisableVvmRows = manageVvmStatusForStock && isVaccine === true;

  useEffect(() => {
    if (shouldDisableVvmRows) {
      const disabledRows = rows
        ?.filter(row => row.vvmStatus?.unusable)
        .map(({ id }) => id);
      setDisabledRows(disabledRows ?? []);
    } else {
      setDisabledRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldDisableVvmRows, rows]);
};
