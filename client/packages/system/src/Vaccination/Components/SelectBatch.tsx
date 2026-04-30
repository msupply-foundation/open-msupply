import React, { useEffect, useMemo } from 'react';
import {
  BasicSpinner,
  Checkbox,
  ColumnDef,
  ColumnType,
  MaterialTable,
  useSimpleMaterialTable,
  useTranslation,
} from '@openmsupply-client/common';
import { StockLineFragment, useItem } from '../../Item';
import { VaccinationStockLine } from '../api';

interface SelectBatchProps {
  itemId: string;
  isNewlyGiven: boolean;
  stockLine: VaccinationStockLine | null;
  setStockLine: (stockLine: VaccinationStockLine | null) => void;
}

export const SelectBatch = ({
  itemId,
  isNewlyGiven,
  stockLine,
  setStockLine,
}: SelectBatchProps) => {
  const t = useTranslation();
  const {
    stockLinesFromItem: { data, isLoading },
  } = useItem(itemId);

  const availableDoses = (data?.nodes ?? []).filter(
    n => getRemainingDoses(n) >= 1
  );
  const selectedIsAvailable = availableDoses.some(
    n => n.id === stockLine?.id
  );

  // Auto-select the only available batch, or clear selection if the previously selected batch is no longer available
  useEffect(() => {
    if (!selectedIsAvailable) {
      const autoSelect =
        availableDoses.length === 1 && isNewlyGiven
          ? availableDoses[0]!
          : null;
      setStockLine(autoSelect);
    }
  }, [data, isNewlyGiven, stockLine]);

  const columns = useMemo(
    (): ColumnDef<StockLineFragment>[] => [
      {
        accessorKey: 'select',
        header: '',
        size: 50,
        Cell: ({ row: { original: row } }) => (
          <Checkbox
            disabled={getRemainingDoses(row) < 1}
            checked={row.id === stockLine?.id}
          />
        ),
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 150,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        columnType: ColumnType.Date,
        size: 100,
      },
      {
        id: 'doses',
        accessorFn: row => {
          const remainingDoses = getRemainingDoses(row);
          return remainingDoses < 1
            ? '<1'
            : Math.floor(remainingDoses);
        },
        header: t('label.doses'),
        size: 80,
      },
    ],
    [stockLine]
  );

  return (
    isLoading ? (
      <BasicSpinner />
    ) : (
      <BatchTable
        columns={columns}
        data={data?.nodes ?? []}
        // Allow un-selecting of stock line, if don't want to record
        // transaction
        setStockLine={newStockLine =>
          setStockLine(
            newStockLine.id === stockLine?.id ? null : newStockLine
          )
        }
      />
    )
  );
};

const BatchTable = ({
  columns,
  data,
  setStockLine,
}: {
  columns: ColumnDef<StockLineFragment>[];
  data: StockLineFragment[];
  setStockLine: (stockLine: VaccinationStockLine) => void;
}) => {
  const t = useTranslation();

  const table = useSimpleMaterialTable<StockLineFragment>({
    tableId: 'vaccination-batch-select-table',
    data,
    columns,
    onRowClick: row => getRemainingDoses(row) >= 1 && setStockLine(row),
    getIsRestrictedRow: row => getRemainingDoses(row.original) < 1,
    noDataElement: t('messages.no-stock-available'),
  });

  return <MaterialTable table={table} />;
};

const getRemainingDoses = (rowData: StockLineFragment) => {
  return rowData.item.doses * rowData.availableNumberOfPacks * rowData.packSize;
};
