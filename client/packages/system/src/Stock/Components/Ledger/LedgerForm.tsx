import React, { FC } from 'react';
import {
  useTranslation,
  Box,
  TableProvider,
  createTableStore,
  DataTable,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../../api';
import { useStockLedger } from '../../api/hooks/useStockLedger';
import { useLedgerColumns } from './useLedgerColumns';

interface LedgerFormProps {
  stockLine: StockLineRowFragment;
}
export const LedgerForm: FC<LedgerFormProps> = ({ stockLine }) => {
  const t = useTranslation('inventory');

  const { data, isLoading, isError } = useStockLedger(stockLine);
  const { columns } = useLedgerColumns();

  console.log('data', data);

  return (
    <Box display="flex" sx={{ maxHeight: 300, overflowY: 'auto' }}>
      <TableProvider createStore={createTableStore}>
        <DataTable
          id="stockline-ledger"
          columns={columns}
          data={data?.nodes as any}
          isLoading={isLoading}
          isError={isError}
          noDataMessage={t('messages.no-ledger')}
          overflowX="auto"
        />
      </TableProvider>
    </Box>
  );
};
