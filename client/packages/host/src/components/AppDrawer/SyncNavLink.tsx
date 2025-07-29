import React from 'react';
import {
  AlertIcon,
  AppNavLink,
  DateUtils,
  PreferenceKey,
  RadioIcon,
  SyncErrorVariant,
  usePreference,
  useTranslation,
} from '@openmsupply-client/common';
import { BadgeProps } from '@mui/material';
import { useSync } from '@openmsupply-client/system';
import { useSyncModal } from '../Sync';
import { SyncInfoQuery } from '@openmsupply-client/system/src/Sync/api/operations.generated';

const POLLING_INTERVAL_IN_MILLISECONDS = 60 * 1000; // 1 minute

export const SyncNavLink = () => {
  const t = useTranslation();
  const { data: preferences } = usePreference(
    PreferenceKey.SyncRecordsDisplayThreshold
  );
  const syncRecordsDisplayThreshold =
    preferences?.[PreferenceKey.SyncRecordsDisplayThreshold] ?? 0;

  const showSync = useSyncModal();

  const { syncStatus, numberOfRecordsInPushQueue = 0 } = useSync.utils.syncInfo(
    POLLING_INTERVAL_IN_MILLISECONDS
  );

  const badgeProps = getBadge(
    syncStatus,
    numberOfRecordsInPushQueue,
    syncRecordsDisplayThreshold
  );

  return (
    <AppNavLink
      to="sync"
      onClick={e => {
        // prevent the anchor element from navigating
        e.preventDefault();
        showSync();
      }}
      icon={
        <RadioIcon
          fontSize="small"
          color={syncStatus?.error ? 'disabled' : 'primary'}
        />
      }
      text={t('sync')}
      badgeProps={badgeProps}
    />
  );
};

const getBadge = (
  syncStatus: SyncInfoQuery['syncStatus'],
  syncRecordCount: number,
  displayThreshold: number
): BadgeProps | undefined => {
  if (!syncStatus) return;

  const { errorThreshold, warningThreshold, lastSuccessfulSync, error } =
    syncStatus;

  const isSyncError =
    error?.variant &&
    // We allow connection errors until a threshold is reached (see below)
    // all other errors should be flagged immediately
    error.variant !== SyncErrorVariant.ConnectionError;

  const now = new Date();
  const daysSinceSuccessfulSync = DateUtils.differenceInDays(
    now,
    lastSuccessfulSync?.finished ?? now
  );

  const beyondWarningThreshold = daysSinceSuccessfulSync >= warningThreshold;
  const beyondErrorThreshold = daysSinceSuccessfulSync >= errorThreshold;

  const showCountBadge = syncRecordCount >= displayThreshold;

  if (isSyncError) {
    return {
      badgeContent: <AlertIcon color="error" fontSize="small" />,
    };
  }

  if (showCountBadge) {
    return {
      badgeContent: syncRecordCount,
      color: beyondErrorThreshold
        ? 'error'
        : beyondWarningThreshold
          ? 'warning'
          : 'default',
    };
  }
};
