import React from 'react';
import {
  ColumnAlign,
  DataTable,
  ExpiryDateCell,
  NumUtils,
  TableProvider,
  createTableStore,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftPrescriptionLine } from '@openmsupply-client/invoices/src/types';
import { UnitQuantityCell } from '@openmsupply-client/invoices/src/Prescriptions/api/hooks/utils';

interface StockLineTableProps {
  stocklines: DraftPrescriptionLine[];
  updateQuantity: (batchId: string, packs: number) => void;
}

export const StockLineTable = ({
  stocklines,
  updateQuantity,
}: StockLineTableProps) => {
  const t = useTranslation();

  const columns = useColumns<DraftPrescriptionLine>(
    [
      {
        width: 60,
        key: 'expiry',
        label: 'label.expiry',
        accessor: ({ rowData }) => rowData.expiryDate,
        Cell: ExpiryDateCell,
        align: ColumnAlign.Right,
      },
      {
        width: '100px',
        key: 'batch',
        label: 'label.batch',
        accessor: ({ rowData }) => rowData.stockLine?.batch,
      },
      {
        width: '90px',
        key: 'available',
        label: 'label.available-units',
        accessor: ({ rowData }) =>
          NumUtils.round(
            (rowData.stockLine?.availableNumberOfPacks ?? 0) *
              (rowData.stockLine?.packSize ?? 1),
            2
          ),
      },
      {
        width: '55px',
        key: 'unitQuantity',
        label: 'label.issued',
        accessor: ({ rowData }) =>
          NumUtils.round(
            (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1),
            3
          ),
        setter: row => {
          // Using `as` to allow for the `unitQuantity` field, which doesn't
          // natively exist on DraftStockOutLine. This is preferable to using
          // the `numberOfPacks` field, which would be misleading and need to be
          // overwritten with the correct packs value here.
          const stockLine = { ...row } as Partial<DraftPrescriptionLine> & {
            id: string;
            unitQuantity: number;
          };
          // Convert input units to packs
          const numberOfPacks =
            stockLine.unitQuantity / (stockLine.packSize ?? 1);
          updateQuantity(stockLine.id, numberOfPacks);
        },
        Cell: UnitQuantityCell,
      },
    ],
    {},
    [stocklines]
  );

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="prescription-batches"
        columns={columns}
        data={stocklines ?? []}
        noDataMessage={t('messages.no-stock-available')}
        dense
      />
    </TableProvider>
  );
};
