import React from 'react';
import {
  AlertIcon,
  AppNavLink,
  RadioIcon,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { getBadgeProps } from '../../utils';
import { useSync } from '@openmsupply-client/system';
import { useSyncModal } from '../Sync';

const POLLING_INTERVAL_IN_MILLISECONDS = 60 * 1000;

export const SyncNavLink = () => {
  const t = useTranslation();
  const theme = useTheme();
  const showSync = useSyncModal();

  const { syncStatus, numberOfRecordsInPushQueue } = useSync.utils.syncInfo(
    POLLING_INTERVAL_IN_MILLISECONDS
  );

  // the Badge does not show if the content is 0
  // somehow though the numberOfRecordsInPushQueue can be '0' which does show
  const syncCount = Number(numberOfRecordsInPushQueue);
  const badgeProps = getBadgeProps(Number.isNaN(syncCount) ? 0 : syncCount);

  if (syncStatus && syncStatus.error) {
    badgeProps.color = 'default';
    badgeProps.badgeContent = (
      <AlertIcon
        color="error"
        fontSize="small"
        fill={theme.palette.background.drawer}
      />
    );
  }
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
