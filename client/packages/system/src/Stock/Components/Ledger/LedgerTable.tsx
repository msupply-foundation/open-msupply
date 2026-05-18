import React from 'react';
import {
  useTranslation,
  useNonPaginatedMaterialTable,
  MaterialTable,
  NothingHere,
} from '@openmsupply-client/common';
import { LedgerRowFragment, StockLineRowFragment } from '../../api';
import { useStockLedger } from '../../api/hooks/useStockLedger';
import { useLedgerColumns } from './useLedgerColumns';

interface LedgerTableProps {
  stockLine: StockLineRowFragment;
}
export const LedgerTable = ({ stockLine }: LedgerTableProps) => {
  const t = useTranslation();

  const { data, isFetching, isError } = useStockLedger(stockLine);
  const columns = useLedgerColumns();

  const { table } = useNonPaginatedMaterialTable<LedgerRowFragment>({
    tableId: 'stockline-ledger',
    columns,
    data: data?.nodes,
    isError,
    isLoading: isFetching,
    enableRowSelection: false,
    noDataElement: <NothingHere body={t('messages.no-ledger')} />,
  });

  return <MaterialTable table={table} />;
};
