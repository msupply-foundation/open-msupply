import React, { PropsWithChildren, useState, useEffect } from 'react';

import {
  DateUtils,
  Formatter,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
  useFormatDateTime,
  useNativeClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { SyncProgress } from '../SyncProgress';

const STATUS_POLLING_INTERVAL = 1000;

const useHostSync = () => {
  // Polling whenever Sync page is opened
  const { syncStatus, numberOfRecordsInPushQueue } = useSync.utils.syncInfo(
    STATUS_POLLING_INTERVAL
  );
  const { mutateAsync: manualSync } = useSync.sync.manualSync();
  const { allowSleep, keepAwake } = useNativeClient();

  // true by default to wait for first syncStatus api result
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!syncStatus) {
      return;
    }
    // When we receive syncStatus, resulting isLoading state should be = isSyncing form api result
    setIsLoading(false);
  }, [syncStatus]);

  useEffect(() => {
    if (syncStatus?.isSyncing) {
      keepAwake();
    } else {
      allowSleep();
    }
  }, [syncStatus?.isSyncing]);

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
    latestSuccessfulSyncDate: DateUtils.getDateOrNull(
      syncStatus?.lastSuccessfulSync?.started || null
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
    latestSuccessfulSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useHostSync();

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

  const formattedLatestSuccessfulSyncDate = latestSuccessfulSyncDate ? (
    <Grid container gap={1} flexWrap="nowrap">
      <Grid item flex={1} style={{ whiteSpace: 'nowrap' }}>
        {Formatter.sentenceCase(relativeDateTime(latestSuccessfulSyncDate))}
      </Grid>
      <Grid item flex={1} style={{ whiteSpace: 'nowrap' }}>
        {`( ${t('messages.ago', {
          time: localisedDistanceToNow(latestSuccessfulSyncDate),
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
        style={{ padding: '15 15 50 15', minWidth: 650 }}
        flexWrap="nowrap"
      >
        <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
          {t('heading.synchronise-status')}
        </Typography>
        <Row title={t('sync-info.number-to-push')}>
          <Typography>{numberOfRecordsInPushQueue}</Typography>
        </Row>
        <Row title={t('sync-info.last-sync')}>{formattedLatestSyncDate}</Row>
        {!!syncStatus?.error ? (
          <Row title={t('sync-info.last-successful-sync')}>
            {formattedLatestSuccessfulSyncDate}
          </Row>
        ) : null}
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
  <Grid container padding={1}>
    <Grid item flex={1} flexBasis="40%">
      <Typography fontWeight={700}>{title}</Typography>
    </Grid>
    <Grid item flex={1} flexBasis="60%">
      {children}
    </Grid>
  </Grid>
);
