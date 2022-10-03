import React, { PropsWithChildren, useState, useEffect } from 'react';

import {
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
  const { localisedDate, localisedTime } = useFormatDateTime();
  // Polling whenever Sync page is opened
  const { data } = useHost.utils.syncInfo(STATUS_POLLING_INTERVAL);
  const { mutateAsync: manualSync } = useHost.sync.manualSync();

  // Derived state
  const [latestSyncDate, setLatestSyncDate] = useState<null | string>(null);
  // true by default to wait for first syncStatus api result
  const [isLoading, setIsLoading] = useState(true);

  const syncStatus = data?.syncStatus;
  const numberOfRecordsInPushQueue = data?.numberOfRecordsInPushQueue;

  useEffect(() => {
    if (!syncStatus) {
      return;
    }
    // Generate latestSyncDate
    const date = new Date(syncStatus.summary.started);
    setLatestSyncDate(`${localisedDate(date)} ${localisedTime(date)}`);
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
    syncStatus,
    latestSyncDate,
    numberOfRecordsInPushQueue,
    onManualSync,
  };
};

export const Sync: React.FC = () => {
  const t = useTranslation('common');
  const {
    syncStatus,
    latestSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useSync();

  return (
    <Grid style={{ padding: 15 }} justifyContent="center">
      <Grid
        container
        flexDirection="column"
        justifyContent="flex-start"
        style={{ padding: 15, width: 400 }}
        flexWrap="nowrap"
      >
        <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
          {t('heading.sync-status')}
        </Typography>
        <Row title={t('sync-info.number-to-push')}>
          {numberOfRecordsInPushQueue}
        </Row>
        <Row title={t('sync-info.last-sync')}>{latestSyncDate}</Row>
        <Row>
          <LoadingButton
            isLoading={isLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            sx={{ fontSize: '12px' }}
            disabled={false}
            onClick={onManualSync}
          >
            {t('button.manual-sync')}
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

const Row: React.FC<PropsWithChildren<RowProps>> = ({ title, children }) => {
  return (
    <Grid container style={{ paddingBottom: 15 }}>
      <Grid item flexShrink={0} flexGrow={1}>
        <Typography style={{ fontSize: 16 }}>{title}</Typography>
      </Grid>
      {children}
    </Grid>
  );
};
