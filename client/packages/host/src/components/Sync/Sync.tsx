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
  const {
    syncStatus,
    latestSyncDate,
    latestSuccessfulSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useHostSync();
  const { data } = useSync.utils.lastSuccessfulUserSync(
    STATUS_POLLING_INTERVAL
  );
  const { mutateAsync: updateUser, isLoading: updateUserIsLoading } =
    useSync.sync.updateUser();

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
        <Row title={t('sync-info.last-sync')}>
          <FormattedSyncDate date={latestSyncDate} />
        </Row>
        {!!syncStatus?.error ? (
          <Row title={t('sync-info.last-successful-sync')}>
            <FormattedSyncDate date={latestSuccessfulSyncDate} />
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
      <Grid
        container
        flexDirection="column"
        justifyContent="flex-start"
        style={{ padding: '15 15 50 15', minWidth: 650 }}
        marginTop={2}
        flexWrap="nowrap"
      >
        <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
          {t('heading.user-sync')}
        </Typography>
        <Row title={t('sync-info.last-successful-sync')}>
          <FormattedSyncDate
            date={DateUtils.getDateOrNull(data?.lastSuccessfulSync || null)}
          />
        </Row>
        <Row>
          <LoadingButton
            isLoading={updateUserIsLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            sx={{ fontSize: '12px' }}
            disabled={false}
            onClick={async () => await updateUser()}
          >
            {t('button.sync-now')}
          </LoadingButton>
        </Row>
      </Grid>
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

const FormattedSyncDate = ({ date }: { date: Date | null }) => {
  const t = useTranslation('common');
  const { localisedDistanceToNow, relativeDateTime } = useFormatDateTime();

  if (!date) return null;

  const relativeTime = `( ${t('messages.ago', {
    time: localisedDistanceToNow(date),
  })} )`;

  return (
    <Grid display="flex" container gap={1}>
      <Grid item flex={0} style={{ whiteSpace: 'nowrap' }}>
        {Formatter.sentenceCase(relativeDateTime(date))}
      </Grid>
      <Grid item flex={1} style={{ whiteSpace: 'nowrap' }}>
        {relativeTime}
      </Grid>
    </Grid>
  );
};
