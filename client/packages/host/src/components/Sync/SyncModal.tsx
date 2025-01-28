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
  useIsScreen,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { SyncProgress } from '../SyncProgress';
import { BasicModal, IconButton } from '@common/components';
import { ServerInfo } from '../../Admin/ServerInfo';

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
  const isMobile = useIsScreen('sm');

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
      width={!isMobile ? width : 340}
      height={!isMobile ? height : 600}
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

        <Grid
          container
          flexDirection="column"
          justifyContent="flex-start"
          sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              minWidth: 300,
              padding: 0,
              marginTop: '50px',
            },
            padding: 2,
            paddingBottom: 6,
            minWidth: 650
          })}
          flexWrap="nowrap"
        >
          <Typography variant="h5" color="primary" sx={{ paddingBottom: 1.25 }}>
            {t('heading.synchronise-status')}
          </Typography>
          <Typography sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              textWrap: 'wrap',
            },
            paddingBottom: 2,
            fontSize: 12,
            maxWidth: 650
          })}
          >
            {!isMobile ?
              t('sync-info.summary')
                .split('\n')
                .map(line => (
                  <div>{line}</div>
                )) :
              t('sync-info.summary')
            }
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
              <Grid flex={0} style={{ whiteSpace: 'nowrap' }}>
                {DateUtils.formatDuration(durationAsDate)}
              </Grid>
            </Grid>
          </Row>
          <Row title={t('sync-info.last-successful-sync')}>
            <FormattedSyncDate date={latestSuccessfulSyncDate} />
          </Row>
          <Row>
            <LoadingButton
              shouldShrink={false}
              autoFocus
              isLoading={isLoading || updateUserIsLoading}
              startIcon={<RadioIcon sx={{ color: "#fff!important" }} />}
              variant="contained"
              sx={theme => ({
                [theme.breakpoints.down('sm')]: {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  margin: '1em'
                },
                color: theme.palette.common.white,
                fontSize: '12px',
              })}
              disabled={false}
              onClick={sync}
              label={t('button.sync-now')}
            />
            <ShowStatus
              isSyncing={isLoading}
              isUpdatingUser={updateUserIsLoading}
            />
          </Row>
          <ServerInfo />
        </Grid>
        {!isMobile && <SyncProgress syncStatus={syncStatus} isOperational={true} />}
      </Grid>
    </BasicModal>
  );
};

interface RowProps {
  title?: string;
}

const Row: React.FC<PropsWithChildren<RowProps>> = ({ title, children }) => (
  <Grid
    container
    sx={theme => ({
      [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        padding: '0em .5em 1em 0em',
      },
      padding: 1,
    })}
  >
    <Grid flex={1} flexBasis="40%">
      <Typography fontWeight={700}>{title}</Typography>
    </Grid>
    <Grid flex={1} flexBasis="60%">
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
    <Grid display="flex" flexDirection="row" container gap={1}>
      <Grid style={{ whiteSpace: 'nowrap' }}>
        {Formatter.sentenceCase(relativeDateTime(date))}
      </Grid>
      <Grid style={{ whiteSpace: 'nowrap' }}>{relativeTime}</Grid>
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
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          position: 'absolute',
          left: 0,
          top: 0,
          margin: '1em'
        },
        fontSize: 12,
        textAlign: 'center',
        width: '115px'
      })}
      padding={1}
    >
      {t(message)}
    </Typography>
  );
};
