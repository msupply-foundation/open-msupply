import React from 'react';
import {
  AlertIcon,
  AppNavLink,
  RadioIcon,
  SyncErrorVariant,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { useSync } from '@openmsupply-client/system';
import { useSyncModal } from '../Sync';

const POLLING_INTERVAL_IN_MILLISECONDS = 60 * 1000;

export const SyncNavLink = () => {
  const t = useTranslation();
  const theme = useTheme();
  const showSync = useSyncModal();

  const { syncStatus } = useSync.utils.syncInfo(
    POLLING_INTERVAL_IN_MILLISECONDS
  );

  const warningThreshold = syncStatus?.warningThreshold || 1;
  const errorThreshold = syncStatus?.errorThreshold || 3;
  const lastSuccessfulSync = syncStatus?.lastSuccessfulSync?.finished;
  let showWarning = false;
  let showError =
    !!syncStatus?.error?.variant &&
    syncStatus?.error?.variant !== SyncErrorVariant.ConnectionError;

  if (lastSuccessfulSync && !showError) {
    const now = new Date();
    const lastSuccessfulSyncDate = new Date(lastSuccessfulSync).valueOf();
    const warningDate = new Date(now).setDate(now.getDate() - warningThreshold);
    const errorDate = new Date(now).setDate(now.getDate() - errorThreshold);

    showWarning = lastSuccessfulSyncDate < warningDate;
    showError = lastSuccessfulSyncDate < errorDate;
  }

  const badgeProps = (showError || showWarning) && {
    badgeContent: (
      <AlertIcon
        color={showError ? 'error' : 'warning'}
        fontSize="small"
        fill={theme.palette.background.drawer}
      />
    ),
    color: 'default' as 'primary' | 'default',
  };

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
      badgeProps={badgeProps || undefined}
    />
  );
};
