import React, { useCallback } from 'react';
import {
  Divider,
  Box,
  MaterialTable,
  useTranslation,
  useFormatNumber,
  useSimpleMaterialTable,
  usePreferences,
  DateUtils,
  useShallow,
} from '@openmsupply-client/common';

import { usePrescriptionLineEditColumns } from './columns';
import {
  DraftStockOutLineFragment,
  useAllocationContext,
} from '../../StockOut';

export interface PrescriptionLineEditTableProps {
  disabled?: boolean;
}

export const PrescriptionLineEditTable = ({
  disabled = false,
}: PrescriptionLineEditTableProps) => {
  const t = useTranslation();
  const { format } = useFormatNumber();
  const prefs = usePreferences();
  // Select only the fields actually used. Spreading the whole state into the
  // selector returns a fresh object every call, which under React 19's stricter
  // useSyncExternalStore snapshot caching causes an infinite re-render loop.
  const { draftLines, allocateIn, item, manualAllocate } = useAllocationContext(
    useShallow(state => ({
      draftLines: state.draftLines,
      allocateIn: state.allocateIn,
      item: state.item,
      manualAllocate: state.manualAllocate,
    }))
  );

  const allocate = (key: string, value: number) => {
    const num = Number.isNaN(value) ? 0 : value;
    return manualAllocate(key, num, format, t);
  };

  const { expiredStockPreventIssue = false, expiredStockIssueThreshold = 0 } =
    prefs;

  const getIsDisabled = useCallback(
    (row: DraftStockOutLineFragment) => {
      if (disabled) return true;
      if (!!row.vvmStatus?.unusable) return true;
      if (row.stockLineOnHold || row.location?.onHold) return true;

      // Prevent issuing expired stock if preference is set, up to threshold
      if (expiredStockPreventIssue && !!row.expiryDate) {
        const threshold = expiredStockIssueThreshold ?? 0;
        const daysBeforeExpiry = DateUtils.differenceInDays(
          row.expiryDate,
          Date.now()
        );
        if (daysBeforeExpiry <= threshold) return true;
      }

      return false;
    },
    [disabled, expiredStockPreventIssue, expiredStockIssueThreshold]
  );

  const columns = usePrescriptionLineEditColumns({
    allocate,
    item,
    allocateIn: allocateIn.type,
    getIsDisabled,
  });

  const table = useSimpleMaterialTable({
    tableId: 'prescription-line-edit',
    columns,
    data: draftLines,
    getIsRestrictedRow: row => getIsDisabled(row.original),
    enableRowSelection: false,
  });

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        sx={{
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {!!draftLines.length && <MaterialTable table={table} />}
      </Box>
    </Box>
  );
};
