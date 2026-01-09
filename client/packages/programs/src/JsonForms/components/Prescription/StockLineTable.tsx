import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  MaterialTable,
  useSimpleMaterialTable,
  useTranslation,
  NumberInputCell,
} from '@openmsupply-client/common';
import { DraftPrescriptionLine } from '@openmsupply-client/invoices/src/types';

interface StockLineTableProps {
  stocklines: DraftPrescriptionLine[];
  updateQuantity: (batchId: string, packs: number) => void;
}

export const StockLineTable = ({
  stocklines,
  updateQuantity,
}: StockLineTableProps) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<DraftPrescriptionLine>[] => [
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry'),
        columnType: ColumnType.Date,
        size: 60,
      },
      {
        accessorKey: 'stockLine.batch',
        header: t('label.batch'),
        size: 100,
      },
      {
        id: 'available',
        accessorFn: row =>
          (row.stockLine?.availableNumberOfPacks ?? 0) *
          (row.stockLine?.packSize ?? 1),
        header: t('label.available-units'),
        columnType: ColumnType.Number,
        size: 90,
      },
      {
        id: 'unitQuantity',
        accessorFn: row =>
          (row.numberOfPacks ?? 0) * (row.packSize ?? 1),
        header: t('label.issued'),
        size: 55,
        Cell: ({ cell, row: { original: row } }) => {
          return <NumberInputCell
            cell={cell}
            updateFn={value => {
              // Convert input units to packs
              const numberOfPacks = value / (row.packSize ?? 1);
              updateQuantity(row.id, numberOfPacks);
            }}
            max={
              (row.stockLine?.availableNumberOfPacks ?? 0) *
              (row.stockLine?.packSize ?? 1)
            }
          />;
        }
      },
    ],
    [stocklines]
  );

  const table = useSimpleMaterialTable({
    tableId: 'patient-program-encounters-prescription-batches',
    columns,
    data: stocklines,
    noDataElement: t('messages.no-stock-available'),
  })

  return <MaterialTable table={table} />;
};
