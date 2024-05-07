import React, { PropsWithChildren, useState, useEffect } from 'react';

import {
  DateUtils,
  Formatter,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
  useAuthContext,
  useFormatDateTime,
  useNativeClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { SyncProgress } from '../SyncProgress';
import { ServerInfo } from './ServerInfo';

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

export const Sync = () => {
  const t = useTranslation('app');
  const {
    syncStatus,
    latestSyncDate,
    latestSuccessfulSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useHostSync();
  const {
    updateUserIsLoading,
    lastSuccessfulSync,
    updateUser,
    updateUserError,
  } = useAuthContext();

  const sync = async () => {
    await updateUser();
    await onManualSync();
  };

  return (
    <Grid style={{ padding: 15 }} justifyContent="center">
      <ServerInfo />
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
        <Row title={t('sync-info.user-last-updated')}>
          <FormattedSyncDate
            date={DateUtils.getDateOrNull(lastSuccessfulSync || null)}
          />
          {!!updateUserError && (
            <Typography color="error">{updateUserError}</Typography>
          )}
        </Row>
        {!!syncStatus?.error ? (
          <Row title={t('sync-info.last-successful-sync')}>
            <FormattedSyncDate date={latestSuccessfulSyncDate} />
          </Row>
        ) : null}
        <Row>
          <LoadingButton
            isLoading={isLoading || updateUserIsLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            sx={{ fontSize: '12px' }}
            disabled={false}
            onClick={sync}
          >
            {t('button.sync-now')}
          </LoadingButton>
          <ShowStatus
            isSyncing={isLoading}
            isUpdatingUser={updateUserIsLoading}
          />
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

const FormattedSyncDate = ({ date }: { date: Date | null }) => {
  const t = useTranslation();
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

const ShowStatus = ({
  isSyncing,
  isUpdatingUser,
}: {
  isSyncing: boolean;
  isUpdatingUser: boolean;
}) => {
  const t = useTranslation('');
  if (!isSyncing && !isUpdatingUser) return null;

  const message = isSyncing ? 'sync-info.syncing' : 'sync-info.updating-user';
  return (
    <Typography
      sx={{ fontSize: 12, textAlign: 'center', width: '115px' }}
      padding={1}
    >
      {t(message)}
    </Typography>
  );
};
