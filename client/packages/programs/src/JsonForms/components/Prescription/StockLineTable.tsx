import React from 'react';
import {
  DataTable,
  NumberInputCell,
  TableProvider,
  createTableStore,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from 'packages/invoices/src/types';

interface StockLineTableProps {
  stocklines: DraftStockOutLine[];
  handleStockLineUpdate: (lines: DraftStockOutLine[]) => void;
}

export const StockLineTable = ({
  stocklines,
  handleStockLineUpdate,
}: StockLineTableProps) => {
  const t = useTranslation();
  const handleUpdateDraft = (input: Partial<DraftStockOutLine>) => {
    const updatedDraftLines = [...stocklines];
    const lineIndex = updatedDraftLines.findIndex(line => line.id === input.id);
    if (updatedDraftLines[lineIndex]) {
      updatedDraftLines[lineIndex] = {
        ...updatedDraftLines[lineIndex],
        ...input,
      };
      handleStockLineUpdate(updatedDraftLines);
    }
  };

  const columns = useColumns<DraftStockOutLine>(
    [
      {
        width: '100px',
        key: 'batch',
        label: 'label.batch',
        accessor: ({ rowData }) => rowData.stockLine?.batch,
      },
      {
        width: '100px',
        key: 'expiry',
        label: 'label.expiry',
        accessor: ({ rowData }) => rowData.expiryDate,
      },
      {
        width: '90px',
        key: 'available',
        label: 'label.available',
        accessor: ({ rowData }) => rowData.stockLine?.availableNumberOfPacks,
      },
      {
        width: '55px',
        key: 'numberOfPacks',
        label: 'label.amount',
        accessor: ({ rowData }) => rowData.numberOfPacks,
        setter: handleUpdateDraft,
        Cell: props => <NumberInputCell {...props} />,
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
