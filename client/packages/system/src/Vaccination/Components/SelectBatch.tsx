import {
  BasicSpinner,
  Checkbox,
  Column,
  ColumnAlign,
  createTableStore,
  DataTable,
  NumUtils,
  Switch,
  TableProvider,
  useColumns,
  useRowStyle,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useEffect } from 'react';
import { StockLineFragment, useStockLines } from '../../Item';
import { VaccinationStockLine } from '../api';

interface SelectBatchProps {
  itemId: string;
  stockLine: VaccinationStockLine | null;
  setStockLine: (stockLine: VaccinationStockLine | null) => void;
}

export const SelectBatch = ({
  itemId,
  stockLine,
  setStockLine,
}: SelectBatchProps) => {
  const { data, isLoading } = useStockLines(itemId);

  useEffect(() => {
    if (data?.nodes?.length === 1) {
      setStockLine(data.nodes[0]!);
    }
  }, [data]);

  const columns = useColumns<StockLineFragment>(
    [
      {
        key: 'select',
        Cell: ({ rowData }) => (
          <Checkbox checked={rowData.id === stockLine?.id} />
        ),
      },
      'batch',
      ['expiryDate', { align: ColumnAlign.Left }],
      {
        key: 'doses',
        label: 'label.doses',
        accessor: ({ rowData }) =>
          NumUtils.round(
            rowData.item.doses *
              rowData.availableNumberOfPacks *
              rowData.packSize
          ),
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
          setStockLine={setStockLine}
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
  const t = useTranslation('dispensary');
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    setRowStyles(
      data.map(r => r.id),
      {
        height: 'unset',
        '& td': {
          padding: 0,
        },
      }
    );
  }, [data]);

  const AdministerWithoutStockTransaction = () => {
    // If no stock , switch to continue
    // Otherwise... switch before item?
    return (
      <Switch
        label={
          // t('messages.no-stock-available') +
          'No stock available. Continue without transaction?'
        }
        checked={false}
        onChange={
          () => {}
          // updateDraft({
          //   createTransactions: !draft.createTransactions,
          // })
        }
        labelPlacement="end"
        size="small"
      />
    );
  };

  return (
    <DataTable
      id="vaccination-batches"
      columns={columns}
      data={data}
      noDataMessage={t('messages.no-stock-available')}
      onRowClick={row => setStockLine(row)}
      dense
    />
  );
};
