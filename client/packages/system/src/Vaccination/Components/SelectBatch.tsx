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

  // Auto-select if there is only one stock line (and not already selected)
  useEffect(() => {
    if (data?.nodes?.length === 1 && !stockLine && isNewlyGiven) {
      setStockLine(data.nodes[0]!);
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
    getIsRestrictedRow: row => getRemainingDoses(row) < 1,
    noDataElement: t('messages.no-stock-available'),
  });

  return <MaterialTable table={table} />;
};

const getRemainingDoses = (rowData: StockLineFragment) => {
  return rowData.item.doses * rowData.availableNumberOfPacks * rowData.packSize;
};
