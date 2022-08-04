import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  ColumnFormat,
  useTranslation,
} from '@openmsupply-client/common';
import { useLog, LogRowFragment } from '../api';

export const LogList: FC<{ recordId: string }> = ({ recordId }) => {
  const { data, isError, isLoading } = useLog.document.listByRecord(recordId);
  const t = useTranslation();
  const columns = useColumns<LogRowFragment>([
    { key: 'datetime', label: 'label.date', format: ColumnFormat.Date },
    {
      key: 'username',
      label: 'label.user',
      accessor: ({ rowData }) => rowData?.user?.username ?? '',
    },
    { key: 'type', label: 'label.details' },
  ]);

  return (
    <DataTable
      key="name-list"
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      noDataMessage={t('messages.no-log-entries')}
    />
  );
};
