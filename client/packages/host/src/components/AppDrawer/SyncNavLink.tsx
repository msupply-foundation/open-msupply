import React from 'react';
import {
  AlertIcon,
  AppNavLink,
  DateUtils,
  RadioIcon,
  SyncErrorVariant,
  useTranslation,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { useSyncModal } from '../Sync';
import { SyncInfoQuery } from 'packages/system/src/Sync/api/operations.generated';

const POLLING_INTERVAL_IN_MILLISECONDS = 60 * 1000;

export const SyncNavLink = () => {
  const t = useTranslation();
  const showSync = useSyncModal();

  const { syncStatus } = useSync.utils.syncInfo(
    POLLING_INTERVAL_IN_MILLISECONDS
  );

  const badgeProps = getBadge(syncStatus);

  return (
    <AppNavLink
      to="sync"
      onClick={e => {
        // prevent the anchor element from navigating
        e.preventDefault();
        showSync();
      }}
      icon={<RadioIcon fontSize="small" color="primary" />}
      text={t('sync')}
      badgeProps={badgeProps}
    />
  );
};

const getBadge = (syncStatus: SyncInfoQuery['syncStatus']) => {
  if (!syncStatus) return;

  const { warningThreshold, errorThreshold, lastSuccessfulSync, error } =
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

  if (isSyncError || beyondWarningThreshold) {
    return {
      badgeContent: (
        <AlertIcon
          color={isSyncError || beyondErrorThreshold ? 'error' : 'warning'}
          fontSize="small"
        />
      ),
      color: 'default' as 'primary' | 'default',
    };
  }
};
