import React, { useMemo } from 'react';
import {
  ColumnDef,
  MaterialTable,
  ReasonOptionNodeType,
  useSimpleMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ReasonOptionRowFragment,
  ReasonOptionsSearchInput,
} from '@openmsupply-client/system';
import { TextInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/TextInputCell';

interface ReturnWithReason {
  id: string;
  itemCode: string;
  itemName: string;
  expiryDate?: string | null;
  batch?: string | null;
  note?: string | null;
  reasonOption?: ReasonOptionRowFragment | null;
}

export const ReturnReasonsComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: ReturnWithReason[];
  updateLine: (line: Partial<ReturnWithReason> & { id: string }) => void;
  isDisabled: boolean;
}) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<ReturnWithReason>[] => [
      {
        accessorKey: 'itemCode',
        header: t('label.code'),
        size: 100,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 200,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry'),
        size: 100,
      },
      // 'itemUnit', // not implemented for now
      {
        accessorKey: 'returnReason',
        header: t('label.reason'),
        Cell: ({ row: { original: row } }) => (
          <ReasonOptionsSearchInput
            type={ReasonOptionNodeType.ReturnReason}
            onChange={reason => updateLine({ ...row, reasonOption: reason })}
            disabled={isDisabled}
            value={row.reasonOption}
          />
        ),
        size: 200,
        pin: 'right',
      },
      {
        accessorKey: 'note',
        header: t('label.comment'),
        Cell: ({ cell, row: { original: row } }) => (
          <TextInputCell
            cell={cell}
            disabled={isDisabled}
            updateFn={value => updateLine({ ...row, note: value })}
          />
        ),
        size: 200,
        pin: 'right',
      }
    ],
    []
  );

  const table = useSimpleMaterialTable<ReturnWithReason>({
    tableId: 'return-line-reason',
    columns,
    data: lines,
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};

export const ReturnReasonsTable = React.memo(ReturnReasonsComponent);
