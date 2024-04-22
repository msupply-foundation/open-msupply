import React, { FC, useState } from 'react';
import {
  useTranslation,
  Box,
  TableProvider,
  createTableStore,
  DataTable,
  SortBy,
} from '@openmsupply-client/common';
import { LedgerRowFragment, StockLineRowFragment } from '../../api';
import { useStockLedger } from '../../api/hooks/useStockLedger';
import { ColumnKey, useLedgerColumns } from './useLedgerColumns';

interface LedgerFormProps {
  stockLine: StockLineRowFragment;
}
export const LedgerForm: FC<LedgerFormProps> = ({ stockLine }) => {
  const t = useTranslation('inventory');

  const [sortBy, setSortBy] = useState<SortBy<LedgerRowFragment>>({
    key: ColumnKey.DateTime,
    direction: 'desc',
  });
  const { data, isLoading, isError } = useStockLedger(stockLine, sortBy);
  const { columns } = useLedgerColumns(sortBy, (key, direction) => {
    setSortBy({ key, direction });
  });

  return (
    <Box display="flex" sx={{ overflowY: 'auto', maxHeight: 400 }}>
      <TableProvider createStore={createTableStore}>
        <DataTable
          id="stockline-ledger"
          columns={columns}
          data={data?.nodes}
          isLoading={isLoading}
          isError={isError}
          noDataMessage={t('messages.no-ledger')}
          overflowX="auto"
        />
      </TableProvider>
    </Box>
  );
};
