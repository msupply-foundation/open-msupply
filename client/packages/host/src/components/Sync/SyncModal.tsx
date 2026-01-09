import React, { useState, useEffect } from 'react';

import {
  Breakpoints,
  CloseIcon,
  DateUtils,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
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
  SettingsIcon,
  RouteBuilder,
  useNavigate,
  UserPermission,
} from '@openmsupply-client/common';
import { mapSyncError, useSync } from '@openmsupply-client/system';
import { SyncProgress } from '../SyncProgress';
import {
  Alert,
  BasicModal,
  BoxedErrorWithDetails,
  ButtonWithIcon,
  IconButton,
} from '@common/components';
import { AppRoute } from '@openmsupply-client/config';

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

export const SyncModal = ({ onCancel, open, width = 800 }: SyncModalProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { userHasPermission } = useAuthContext();
  const { localisedTime, localisedDate } = useFormatDateTime();
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
  const error =
    syncStatus?.error &&
    mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error');

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

  const lastSuccessfulSyncMessage = (
    date: Date,
    durationAsDate: Date
  ): string => {
    // If the date is today, display the time, otherwise display the date
    const today = new Date();
    const lastSuccessfulSyncTime =
      date?.toDateString() === today.toDateString()
        ? localisedTime(date)
        : localisedDate(date);

    // Format the duration into "X hours Y minutes Z seconds" omitting hours or minutes if there are 0 of them.
    const hours = durationAsDate.getHours();
    const minutes = durationAsDate.getMinutes();
    const seconds = durationAsDate.getSeconds();
    let formattedDuration = '';
    if (hours > 0) {
      formattedDuration += `${t('label.hours', { count: hours })} `;
    }
    if (minutes > 0) {
      formattedDuration += `${t('label.minutes', { count: minutes })} `;
    }
    formattedDuration += `${t('label.seconds', { count: seconds })}`;

    // Return "Last successful sync 2:05 PM (completed in 1 second)"
    return t('messages.last-successful-sync-time-and-duration', {
      time: lastSuccessfulSyncTime,
      duration: formattedDuration,
    });
  };

  const modalWidth = Math.min(width, window.innerWidth - 50);
  return (
    <BasicModal
      width={!isExtraSmallScreen ? modalWidth : 340}
      open={open}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <Grid sx={{ padding: 7 }} justifyContent="center">
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
              padding: '0 0 0 2',
            },
            padding: '20 0 40 0',
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

        {error && (
          <Box marginTop="20">
            <BoxedErrorWithDetails {...error} width={'100%'} />
          </Box>
        )}

        {!!numberOfRecordsInPushQueue && numberOfRecordsInPushQueue >= 100 && (
          <Alert
            severity="warning"
            sx={{ fontSize: '14px', marginTop: error ? '5' : '20' }}
          >
            {t('warning.high-number-records-to-sync')}
          </Alert>
        )}

        {!error && latestSuccessfulSyncDate && (
          <Alert
            sx={{
              backgroundColor: theme.palette.background.drawer,
              fontSize: '14px',
              width: '100%',
              marginTop:
                (!!numberOfRecordsInPushQueue &&
                  numberOfRecordsInPushQueue >= 100) ||
                error
                  ? '5'
                  : '20',
            }}
            icon={
              <CheckCircleIcon fontSize="small" sx={{ color: 'gray.dark' }} />
            }
          >
            {lastSuccessfulSyncMessage(
              latestSuccessfulSyncDate,
              durationAsDate
            )}
          </Alert>
        )}

        <Box sx={{ paddingTop: 7 }} display="flex" justifyContent="center">
          <LoadingButton
            shouldShrink={false}
            autoFocus
            isLoading={isLoading || updateUserIsLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            disabled={false}
            onClick={sync}
            label={t('button.sync-now')}
            sx={theme => ({
              marginRight: 1,
              color: theme.palette.common.white,
              fontSize: '14px',
              minWidth: '130px',
              // the text 'Sync Now' is being split over two lines on phones which is messing up the layout
              // this is a quick and dirty fix
              [theme.breakpoints.down('sm')]: {
                fontSize: '12px',
              },
            })}
          />
          {userHasPermission(UserPermission.ServerAdmin) && (
            <ButtonWithIcon
              color={'secondary'}
              onClick={() => {
                onCancel();
                navigate(RouteBuilder.create(AppRoute.Settings).build());
              }}
              Icon={<SettingsIcon />}
              label={t('settings')}
              shouldShrink={false}
              sx={{
                marginLeft: 1,
                fontSize: '14px',
              }}
            />
          )}
        </Box>
      </Grid>
    </BasicModal>
  );
};
