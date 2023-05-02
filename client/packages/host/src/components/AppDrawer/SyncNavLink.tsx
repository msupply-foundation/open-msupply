import React from 'react';
import {
  AlertIcon,
  AppNavLink,
  RadioIcon,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useHost } from '../../api/hooks';
import { getBadgeProps } from '../../utils';

const POLLING_INTERVAL_IN_MILLISECONDS = 60 * 1000;

export const SyncNavLink = () => {
  const t = useTranslation('app');
  const theme = useTheme();
  const { syncStatus, numberOfRecordsInPushQueue } = useHost.utils.syncInfo(
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
      to={AppRoute.Sync}
      icon={<RadioIcon fontSize="small" color="primary" />}
      text={t('sync')}
      badgeProps={badgeProps}
    />
  );
};
