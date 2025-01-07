import React, { PropsWithChildren, useState, useEffect } from 'react';

import {
  CloseIcon,
  DateUtils,
  Formatter,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
  UNDEFINED_STRING_VALUE,
  useAuthContext,
  useFormatDateTime,
  useNativeClient,
  useTranslation,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { SyncProgress } from '../SyncProgress';
import { ServerInfo } from './ServerInfo';
import { BasicModal, IconButton } from '@common/components';

const STATUS_POLLING_INTERVAL = 1000;

interface SyncModalProps {
  open: boolean;
  width?: number;
  height?: number;
  onCancel: () => void;
}

const useHostSync = (enabled: boolean) => {
  // Polling whenever Sync page is opened
  const { syncStatus, numberOfRecordsInPushQueue } = useSync.utils.syncInfo(
    STATUS_POLLING_INTERVAL,
    enabled
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
    latestSyncStart: DateUtils.getDateOrNull(
      syncStatus?.summary?.started || null
    ),
    latestSyncFinish: DateUtils.getDateOrNull(
      syncStatus?.summary?.finished || null
    ),
    latestSuccessfulSyncDate: DateUtils.getDateOrNull(
      syncStatus?.lastSuccessfulSync?.finished || null
    ),
    onManualSync,
    syncStatus,
    numberOfRecordsInPushQueue,
  };
};

export const SyncModal = ({
  onCancel,
  open,
  width = 800,
  height = 500,
}: SyncModalProps) => {
  const t = useTranslation();
  const {
    syncStatus,
    latestSyncStart,
    latestSyncFinish,
    latestSuccessfulSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useHostSync(open);
  const { updateUserIsLoading, updateUser } = useAuthContext();

  const sync = async () => {
    await updateUser();
    await onManualSync();
  };
  const durationAsDate = new Date(
    0,
    0,
    0,
    0,
    0,
    syncStatus?.summary?.durationInSeconds || 0
  );

  return (
    <BasicModal
      width={width}
      height={height}
      open={open}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <Grid sx={{ padding: 2, paddingBottom: 5 }} justifyContent="center">
        <IconButton
          icon={<CloseIcon />}
          color="primary"
          onClick={onCancel}
          sx={{ position: 'absolute', right: 0, top: 0, padding: 2 }}
          label={t('button.close')}
        />

        <ServerInfo />
        <Grid
          container
          flexDirection="column"
          justifyContent="flex-start"
          sx={{ padding: 2, paddingBottom: 6, minWidth: 650 }}
          flexWrap="nowrap"
        >
          <Typography variant="h5" color="primary" sx={{ paddingBottom: 1.25 }}>
            {t('heading.synchronise-status')}
          </Typography>
          <Typography sx={{ paddingBottom: 2, fontSize: 12, maxWidth: 650 }}>
            {t('sync-info.summary')
              .split('\n')
              .map(line => (
                <div>{line}</div>
              ))}
          </Typography>
          <Row title={t('sync-info.number-to-push')}>
            <Typography>{numberOfRecordsInPushQueue}</Typography>
          </Row>
          <Row title={t('sync-info.last-sync-start')}>
            <FormattedSyncDate date={latestSyncStart} />
          </Row>
          <Row title={t('sync-info.last-sync-finish')}>
            <FormattedSyncDate date={latestSyncFinish} />
          </Row>
          <Row title={t('sync-info.last-sync-duration')}>
            <Grid display="flex" container gap={1}>
              <Grid item flex={0} style={{ whiteSpace: 'nowrap' }}>
                {DateUtils.formatDuration(durationAsDate)}
              </Grid>
            </Grid>
          </Row>
          <Row title={t('sync-info.last-successful-sync')}>
            <FormattedSyncDate date={latestSuccessfulSyncDate} />
          </Row>
          <Row>
            <LoadingButton
              autoFocus
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
    </BasicModal>
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

  if (!date) return UNDEFINED_STRING_VALUE;

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
  const t = useTranslation();
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
