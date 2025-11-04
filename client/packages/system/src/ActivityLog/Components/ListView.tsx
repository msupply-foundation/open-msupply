import React, { FC } from 'react';
import {
  DataTable,
  useColumns,
  ColumnFormat,
  useTranslation,
  Formatter,
  TableProvider,
  createTableStore,
  NothingHere,
  Box,
  Typography,
  LocaleKey,
} from '@openmsupply-client/common';
import { useFormatDateTime } from '@common/intl';

import { useActivityLog, ActivityLogRowFragment } from '../api';

const tryParseJSON = (str: string | null | undefined): object | null => {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
};

const formatChangeDetails = (
  from: string | null | undefined,
  to: string | null | undefined,
  t: ReturnType<typeof useTranslation>
): React.ReactNode => {
  const fromJson = tryParseJSON(from);
  const toJson = tryParseJSON(to);

  // Helper to translate field names
  const translateFieldName = (key: string): string => {
    // Try translating with label. prefix first, fallback to the key itself
    const translationKey = `label.${key}` as LocaleKey;
    return t(translationKey, { defaultValue: key });
  };

  // If we have a json `to` object, compare/display the keys
  if (toJson) {
    const changes: React.ReactNode[] = [];
    const allKeys = new Set([
      ...Object.keys(fromJson || {}),
      ...Object.keys(toJson),
    ]);

    allKeys.forEach(key => {
      const fromValue = fromJson && (fromJson as Record<string, unknown>)[key];
      const toValue = (toJson as Record<string, unknown>)[key];

      if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
        if (
          fromValue !== undefined &&
          fromValue !== null &&
          toValue !== undefined &&
          toValue !== null
        ) {
          changes.push(
            <Box key={key}>
              <Typography component="span" fontWeight="bold">
                {translateFieldName(key)}:
              </Typography>{' '}
              {JSON.stringify(fromValue)} {t('log.changed-to')}{' '}
              {JSON.stringify(toValue)}
            </Box>
          );
        } else if (fromValue !== undefined && fromValue !== null) {
          changes.push(
            <Box key={key}>
              <Typography component="span" fontWeight="bold">
                {translateFieldName(key)}:
              </Typography>{' '}
              {t('log.removed')} {JSON.stringify(fromValue)}
            </Box>
          );
        } else {
          changes.push(
            <Box key={key}>
              <Typography component="span" fontWeight="bold">
                {translateFieldName(key)}:
              </Typography>{' '}
              {JSON.stringify(toValue)}
            </Box>
          );
        }
      }
    });

    return changes.length > 0 ? (
      <Box display="flex" flexDirection="column" gap={0.5}>
        {changes}
      </Box>
    ) : undefined;
  }

  // Fallback: Check if it's already a string with a single field changes (old style)
  if (from && to) {
    const combinedText = `[${from}] ${t('log.changed-to')} [${to}]`;
    return combinedText;
  } else if (from) {
    return `${t('log.changed-from')} [${from}]`;
  }

  return undefined;
};

export const ActivityLogList: FC<{ recordId: string }> = ({ recordId }) => {
  const { data, isError, isLoading } = useActivityLog(recordId);
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
      Cell: ({ rowData }) => formatChangeDetails(rowData?.from, rowData?.to, t),
    },
  ]);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="name-list"
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere body={t('messages.no-log-entries')} />}
        overflowX="auto"
      />
    </TableProvider>
  );
};
