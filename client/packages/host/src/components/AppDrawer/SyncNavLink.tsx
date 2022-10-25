import {
  AlertIcon,
  AppNavLink,
  RadioIcon,
  Tooltip,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import React from 'react';
import { useHost } from '../../api/hooks';

export const SyncNavLink = () => {
  const t = useTranslation('app');
  const theme = useTheme();
  const { data: syncSettings } = useHost.settings.syncSettings();
  const { intervalSeconds } = syncSettings || {};
  const pollingIntervalInSeconds =
    intervalSeconds && !Number.isNaN(intervalSeconds)
      ? intervalSeconds / 5
      : 60;
  const { syncStatus, numberOfRecordsInPushQueue } = useHost.utils.syncInfo(
    1000 * pollingIntervalInSeconds
  );

  const badgeProps = {
    badgeContent: numberOfRecordsInPushQueue as React.ReactNode,
    max: 99,
    color: 'primary' as 'primary' | 'default',
  };

  if (syncStatus && syncStatus.error) {
    badgeProps.color = 'default';
    badgeProps.badgeContent = (
      <Tooltip title={'syncStatus?.error?.fullError'}>
        <AlertIcon
          color="error"
          fontSize="small"
          fill={theme.palette.background.drawer}
        />
      </Tooltip>
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
