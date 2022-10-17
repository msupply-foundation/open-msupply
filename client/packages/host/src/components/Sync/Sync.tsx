import React, { PropsWithChildren, useState, useEffect } from 'react';

import {
  DateUtils,
  Formatter,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { useHost } from '../../api/hooks';
import { SyncProgress } from '../SyncProgress';

const STATUS_POLLING_INTERVAL = 1000;

const useSync = () => {
  // Polling whenever Sync page is opened
  const { syncStatus, numberOfRecordsInPushQueue } = useHost.utils.syncInfo(
    STATUS_POLLING_INTERVAL
  );
  const { mutateAsync: manualSync } = useHost.sync.manualSync();

  // true by default to wait for first syncStatus api result
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!syncStatus) {
      return;
    }
    // When we receive syncStatus, resulting isLoading state should be = isSyncing form api result
    setIsLoading(false);
  }, [syncStatus]);

  const onManualSync = async () => {
    // isLoading is reset on next result of polled api query
    setIsLoading(true);
    await manualSync();
  };

  return {
    isLoading: !!syncStatus?.isSyncing || isLoading,
    latestSyncDate: DateUtils.getDateOrNull(
      syncStatus?.summary.started || null
    ),
    onManualSync,
    syncStatus,
    numberOfRecordsInPushQueue,
  };
};

export const Sync: React.FC = () => {
  const t = useTranslation('common');
  const { localisedDistanceToNow, relativeDateTime } = useFormatDateTime();
  const {
    syncStatus,
    latestSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useSync();

  const formattedLatestSyncDate = latestSyncDate ? (
    <Grid display="flex" container gap={1}>
      <Grid item flex={1} style={{ whiteSpace: 'nowrap' }}>
        {Formatter.sentenceCase(relativeDateTime(latestSyncDate))}
      </Grid>
      <Grid item flex={1} style={{ whiteSpace: 'nowrap' }}>
        {`( ${t('messages.ago', {
          time: localisedDistanceToNow(latestSyncDate),
        })} )`}
      </Grid>
    </Grid>
  ) : null;

  return (
    <Grid style={{ padding: 15 }} justifyContent="center">
      <Grid
        container
        flexDirection="column"
        justifyContent="flex-start"
        style={{ padding: '15 15 50 15', minWidth: 500 }}
        flexWrap="nowrap"
      >
        <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
          {t('heading.synchronise-status')}
        </Typography>
        <Row title={t('sync-info.number-to-push')}>
          {numberOfRecordsInPushQueue}
        </Row>
        <Row title={t('sync-info.last-sync')}>{formattedLatestSyncDate}</Row>
        <Row>
          <LoadingButton
            isLoading={isLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            sx={{ fontSize: '12px' }}
            disabled={false}
            onClick={onManualSync}
          >
            {t('button.sync-now')}
          </LoadingButton>
        </Row>
      </Grid>
      <SyncProgress syncStatus={syncStatus} isOperational={true} />
    </Grid>
  );
};

interface RowProps {
  title?: string;
}

const Row: React.FC<PropsWithChildren<RowProps>> = ({ title, children }) => (
  <Grid container display="flex" padding={1}>
    <Grid item flex={1}>
      <Typography fontWeight={700}>{title}</Typography>
    </Grid>
    <Grid item flex={1}>
      <Typography>{children}</Typography>
    </Grid>
  </Grid>
);
