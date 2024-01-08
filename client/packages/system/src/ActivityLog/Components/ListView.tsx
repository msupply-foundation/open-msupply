import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  ColumnFormat,
  useTranslation,
  Formatter,
} from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';

import { useActivityLog, ActivityLogRowFragment } from '../api';

export const ActivityLogList: FC<{ recordId: string }> = ({ recordId }) => {
  const { data, isError, isLoading } =
    useActivityLog.document.listByRecord(recordId);
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<ActivityLogRowFragment>([
    {
      key: 'datetime',
      label: 'label.date',
      format: ColumnFormat.Date,
      width: 150,
    },
    {
      key: 'time',
      label: 'label.time',
      width: 150,
      accessor: ({ rowData }) => localisedTime(rowData.datetime),
    },
    {
      key: 'username',
      label: 'label.user',
      accessor: ({ rowData }) => rowData?.user?.username ?? '',
    },
    {
      key: 'type',
      label: 'label.event',
      accessor: ({ rowData }) =>
        t(Formatter.logTypeTranslation(rowData.type), {
          defaultValue: rowData.type,
        }),
    },
    {
      key: 'changeDetails',
      label: 'label.details',
      accessor: ({ rowData }) => {
        if (rowData?.from && rowData.to) {
          return `[${rowData.from}] ${t('log.changed-to')} [${rowData.to}]`;
        } else if (rowData?.from) {
          return `${t('log.changed-from')} [${rowData.from}]`;
        }
      },
    },
  ]);

  return (
    <DataTable
      id="name-list"
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      noDataMessage={t('messages.no-log-entries')}
      overflowX="auto"
    />
  );
};
