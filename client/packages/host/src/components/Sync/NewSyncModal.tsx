import React, { PropsWithChildren, useState, useEffect } from 'react';

import {
  Breakpoints,
  CloseIcon,
  DateUtils,
  Formatter,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
  UNDEFINED_STRING_VALUE,
  useAppTheme,
  useAuthContext,
  useFormatDateTime,
  useNativeClient,
  useQueryClient,
  useTranslation,
  useMediaQuery,
  useIntlUtils,
  Box,
  CheckCircleIcon,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { SyncProgress } from '../SyncProgress';
import { Alert, BasicModal, IconButton } from '@common/components';

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
  const [isInitialMount, setIsInitialMount] = useState(true);
  const { mutateAsync: manualSync } = useSync.sync.manualSync();
  const { allowSleep, keepAwake } = useNativeClient();

  // true by default to wait for first syncStatus api result
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { invalidateCustomTranslations } = useIntlUtils();

  useEffect(() => {
    if (!syncStatus) {
      return;
    }
    // When we receive syncStatus, resulting isLoading state should be = isSyncing form api result
    setIsLoading(false);
  }, [syncStatus]);

  useEffect(() => {
    if (!syncStatus) {
      return;
    }

    isInitialMount && setIsInitialMount(false);

    if (syncStatus?.isSyncing) {
      keepAwake();
    } else {
      allowSleep();
      queryClient.invalidateQueries(); // refresh the page user is on after sync finishes

      // Reload custom translations, in case we received new ones via sync
      // Shouldn't run on first mount, when translations might still be loading - see issue #9042
      !isInitialMount && invalidateCustomTranslations();
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

export const NewSyncModal = ({
  onCancel,
  open,
  width = 800,
  height = 500,
}: SyncModalProps) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const isExtraSmallScreen = useMediaQuery(
    theme.breakpoints.down(Breakpoints.sm)
  );

  const {
    syncStatus,
    latestSuccessfulSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useHostSync(open);
  const { updateUserIsLoading, updateUser, setStore, store } = useAuthContext();

  const sync = async () => {
    await updateUser();
    await onManualSync();
    if (!!store) {
      await setStore(store);
    }
  };

  const durationAsDate = new Date(
    0,
    0,
    0,
    0,
    0,
    syncStatus?.summary?.durationInSeconds || 0
  );

  const getSyncStatusMessage = (): string => {
    if (syncStatus?.isSyncing === true) {
      return t('sync-info.syncing');
    } else {
      return numberOfRecordsInPushQueue
        ? t('label.records-to-push', { count: numberOfRecordsInPushQueue })
        : t('label.no-records-to-push');
    }
  };

  // TODO refactor this so it returns a string, and add in the number of records that were sent
  // "Last successful sync today at 14:05 (completed in 8 seconds)"
  const lastSuccessfulSyncStatus = (
    date: Date | null,
    durationAsDate: Date
  ): string => {
    const t = useTranslation();
    const { relativeDateTime } = useFormatDateTime();

    if (!date) return UNDEFINED_STRING_VALUE;

    return t('sync-info.last-successful-sync').concat(
      ' ',
      relativeDateTime(date).toLocaleLowerCase(),
      ', ',
      t('label.it-took'),
      ' ',
      DateUtils.formatDuration(durationAsDate)
    );
  };

  return (
    <BasicModal
      width={!isExtraSmallScreen ? width : 340}
      height={!isExtraSmallScreen ? height : 600}
      open={open}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <Grid sx={{ padding: 10 }} justifyContent="center">
        <IconButton
          icon={<CloseIcon />}
          color="primary"
          onClick={onCancel}
          sx={{ position: 'absolute', right: 0, top: 0, padding: 2 }}
          label={t('button.close')}
        />

        <Box
          display="flex"
          flexDirection="column"
          sx={theme => ({
            [theme.breakpoints.down('sm')]: {
              minWidth: 300,
              padding: '0 0 0 2',
            },
            padding: '20 0 40 0',
            marginBottom: '20',
            backgroundColor: theme.palette.background.drawer,
            borderRadius: '10px',
          })}
          flexWrap="nowrap"
        >
          <Typography textAlign="center" marginBottom="10">
            {getSyncStatusMessage()}
          </Typography>
          <SyncProgress syncStatus={syncStatus} isOperational={true} />
        </Box>

        {}
        <Alert
          sx={{
            backgroundColor: theme.palette.background.drawer,
            fontSize: '14px',
            width: '100%',
          }}
          icon={
            <CheckCircleIcon fontSize="small" sx={{ color: 'gray.dark' }} />
          }
        >
          {lastSuccessfulSyncStatus(latestSuccessfulSyncDate, durationAsDate)}
        </Alert>

        {/* <Box>
          <Row title={t('sync-info.number-to-push')}>
            <Typography>{numberOfRecordsInPushQueue}</Typography>
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
        </Box> */}

        <Box display="flex" justifyContent="center">
          <LoadingButton
            shouldShrink={false}
            autoFocus
            isLoading={isLoading || updateUserIsLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            sx={theme => ({
              [theme.breakpoints.down('sm')]: {
                margin: '0em .5em 1em 0em',
              },
              margin: 1,
              color: theme.palette.common.white,
              fontSize: '12px',
            })}
            disabled={false}
            onClick={sync}
            label={t('button.sync-now')}
          />
        </Box>
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
          margin: '1em',
        },
        fontSize: 12,
        textAlign: 'center',
        width: '115px',
      })}
      padding={1}
    >
      {t(message)}
    </Typography>
  );
};
