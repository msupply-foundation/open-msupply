import { useEffect } from 'react';
import {
  PreferenceKey,
  usePreference,
  useTableStore,
} from '@openmsupply-client/common';
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
  const { data: prefs } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry,
    PreferenceKey.ManageVvmStatusForStock
  );

  const shouldDisableVvmRows =
    (prefs?.manageVvmStatusForStock || prefs?.sortByVvmStatusThenExpiry) &&
    isVaccine === true;

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
