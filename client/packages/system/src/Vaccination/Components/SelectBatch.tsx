import {
  BasicSpinner,
  Checkbox,
  Column,
  ColumnAlign,
  createTableStore,
  DataTable,
  TableProvider,
  useColumns,
  useRowStyle,
  useTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useEffect } from 'react';
import { StockLineFragment, useStockLines } from '../../Item';
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
  const { data, isLoading } = useStockLines(itemId);

  // Auto-select if there is only one stock line (and not already selected)
  useEffect(() => {
    if (data?.nodes?.length === 1 && !stockLine && isNewlyGiven) {
      setStockLine(data.nodes[0]!);
    }
  }, [data, isNewlyGiven, stockLine]);

  const columns = useColumns<StockLineFragment>(
    [
      {
        width: '55px',
        key: 'select',
        Cell: ({ rowData, isDisabled }) => (
          <Checkbox
            disabled={isDisabled}
            checked={rowData.id === stockLine?.id}
          />
        ),
      },
      'batch',
      ['expiryDate', { align: ColumnAlign.Left }],
      {
        key: 'doses',
        label: 'label.doses',
        accessor: ({ rowData }) => {
          const remainingDoses = getRemainingDoses(rowData);

          if (remainingDoses < 1) {
            return '<1';
          }
          return Math.floor(remainingDoses);
        },
      },
    ],
    {},
    [itemId, stockLine]
  );

  return (
    <TableProvider createStore={createTableStore}>
      {isLoading ? (
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
      )}
    </TableProvider>
  );
};

const BatchTable = ({
  columns,
  data,
  setStockLine,
}: {
  columns: Column<StockLineFragment>[];
  data: StockLineFragment[];
  setStockLine: (stockLine: VaccinationStockLine) => void;
}) => {
  const t = useTranslation();
  const { setRowStyles } = useRowStyle();
  const { setDisabledRows } = useTableStore();

  useEffect(() => {
    setRowStyles(
      data.map(r => r.id),
      {
        // Make the table a little more compact
        height: 'unset',
        '& td': {
          paddingY: 0,
          paddingLeft: '16',
        },
      }
    );

    const rowsToDisable = data
      ?.filter(row => getRemainingDoses(row) < 1)
      .map(({ id }) => id);
    if (rowsToDisable) setDisabledRows(rowsToDisable);
  }, [data]);

  return (
    <DataTable
      id="vaccination-batches"
      columns={columns}
      data={data}
      noDataMessage={t('messages.no-stock-available')}
      onRowClick={row => getRemainingDoses(row) >= 1 && setStockLine(row)}
      dense
    />
  );
};

const getRemainingDoses = (rowData: StockLineFragment) => {
  return (
    (rowData.itemVariant?.dosesPerUnit ?? rowData.item.doses) *
    rowData.availableNumberOfPacks *
    rowData.packSize
  );
};
