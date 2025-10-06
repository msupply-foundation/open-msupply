import React, { FC, useMemo } from 'react';
import {
  useTranslation,
  Formatter,
  NothingHere,
  useNonPaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';

import { useActivityLog, ActivityLogRowFragment } from '../api';

export const ActivityLogList: FC<{ recordId: string }> = ({ recordId }) => {
  const { data, isError, isFetching } = useActivityLog(recordId);
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  const columns = useMemo(
    (): ColumnDef<ActivityLogRowFragment>[] => [
      {
        accessorKey: 'datetime',
        header: t('label.date'),
        columnType: ColumnType.Date,
      },
      {
        id: 'time',
        header: t('label.time'),
        accessorFn: row => localisedTime(row.datetime),
        align: 'right',
      },
      {
        id: 'username',
        accessorFn: rowData => rowData?.user?.username ?? '',
        header: t('label.user'),
      },
      {
        id: 'type',
        header: t('label.event'),
        accessorFn: rowData =>
          t(Formatter.logTypeTranslation(rowData.type), {
            defaultValue: rowData.type,
          }),
      },
      {
        id: 'changeDetails',
        header: t('label.details'),
        accessorFn: rowData => {
          if (rowData?.from && rowData.to) {
            return `[${rowData.from}] ${t('log.changed-to')} [${rowData.to}]`;
          } else if (rowData?.from) {
            return `${t('log.changed-from')} [${rowData.from}]`;
          }
        },
      },
    ],
    []
  );

  const { table } = useNonPaginatedMaterialTable({
    tableId: 'activity-log-list',
    columns,
    data: data?.nodes || [],
    isLoading: isFetching,
    isError,
    noDataElement: <NothingHere body={t('messages.no-log-entries')} />,
    enableRowSelection: false,
  });

  return <MaterialTable table={table} />;
};
