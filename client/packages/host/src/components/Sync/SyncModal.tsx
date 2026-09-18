import React, { useState, useEffect } from 'react';

import {
  CloseIcon,
  DateUtils,
  Grid,
  LoadingButton,
  RadioIcon,
  Typography,
  useAuthContext,
  useRefreshUserCookie,
  useFormatDateTime,
  useNativeClient,
  useQueryClient,
  useTranslation,
  useIsExtraSmallScreen,
  useIntlUtils,
  Box,
  CheckCircleIcon,
  SettingsIcon,
  RouteBuilder,
  useNavigate,
  UserPermission,
  useAppTheme,
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

const STATUS_POLLING_INTERVAL = 2000;

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
  const { refreshUserCookie } = useRefreshUserCookie();

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

      // Shouldn't run on first mount, when translations might still be loading - see issue #9042
      if (!isInitialMount) {
        // Mark all queries stale but don't refetch active ones immediately.
        // This avoids surrounding UI components to jump around
        queryClient.invalidateQueries({ refetchType: 'none' });
        invalidateCustomTranslations();
        // Pick up permission/user-detail changes that the just-completed sync
        // brought in, so the UI reflects them without forcing a re-login.
        refreshUserCookie();
      }
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

export const SyncModal = ({ onCancel, open, width = 900 }: SyncModalProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { userHasPermission } = useAuthContext();
  const theme = useAppTheme();
  const { localisedTime, localisedDate } = useFormatDateTime();
  const isExtraSmallScreen = useIsExtraSmallScreen();

  const {
    syncStatus,
    latestSuccessfulSyncDate,
    numberOfRecordsInPushQueue,
    isLoading,
    onManualSync,
  } = useHostSync(open);
  const { refreshUserCookie } = useRefreshUserCookie();
  const error =
    syncStatus?.error &&
    mapSyncError(t, syncStatus?.error, 'error.unknown-sync-error');

  const sync = async () => {
    await onManualSync();
    // Pick up permission/user-detail changes that sync just brought in,
    // so the UI reflects them without forcing a re-login.
    await refreshUserCookie();
  };

  const durationAsDate = DateUtils.secondsAsDate(
    DateUtils.durationInSeconds(
      syncStatus?.summary?.started,
      syncStatus?.summary?.finished
    )
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

  return (
    <BasicModal
      // BasicModal clamps to the viewport itself (min(width, 100vw - 64px)),
      // so pass the desired width straight through. Don't re-clamp here against
      // a window.innerWidth snapshot - with no resize listener it gets stuck at
      // a stale narrow value when the window grows back. See issue #12172.
      width={!isExtraSmallScreen ? width : 340}
      open={open}
      data-testid="sync-modal"
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
          testId="sync-modal-close"
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
          <Typography
            textAlign="center"
            marginBottom="10"
            data-testid="sync-status-line"
          >
            {getSyncStatusMessage()}
          </Typography>
          {syncStatus && (
            <SyncProgress syncStatus={syncStatus} isOperational={true} />
          )}
        </Box>

        {error && (
          <Box marginTop="20">
            <BoxedErrorWithDetails {...error} width={'100%'} />
          </Box>
        )}

        {!error && !syncStatus?.isSyncing && latestSuccessfulSyncDate && (
          <Alert
            sx={{
              backgroundColor: theme.palette.background.drawer,
              fontSize: '14px',
              width: '100%',
              marginTop: '20',
            }}
            icon={
              <CheckCircleIcon fontSize="small" sx={{ color: 'gray.dark' }} />
            }
            data-testid="sync-last-successful"
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
            isLoading={isLoading}
            startIcon={<RadioIcon />}
            variant="contained"
            disabled={false}
            onClick={sync}
            label={t('button.sync-now')}
            data-testid="sync-now-button"
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
