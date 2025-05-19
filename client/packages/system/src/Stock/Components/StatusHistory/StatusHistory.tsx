import React, { ReactElement } from 'react';
import {
  TableProvider,
  createTableStore,
  DataTable,
  useTranslation,
} from '@openmsupply-client/common';

import { DraftStockLine } from '../../api';
import { useStatusHistoryColumns } from './useStatusHistoryColumns';

interface StatusHistoryProps {
  draft: DraftStockLine;
  isLoading: boolean;
}

export const StatusHistory = ({
  draft,
  isLoading,
}: StatusHistoryProps): ReactElement => {
  const t = useTranslation();
  const { columns } = useStatusHistoryColumns();

  const vvmStatusLogs = draft?.vvmStatusLogs?.nodes ?? [];

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="stockline-status-history"
        columns={columns}
        data={vvmStatusLogs}
        isLoading={isLoading}
        noDataMessage={t('messages.no-status-history')}
        overflowX="auto"
      />
    </TableProvider>
  );
};
