import {
  AlertIcon,
  AppNavLink,
  RadioIcon,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import React from 'react';
import { useHost } from '../../api/hooks';

const POLLING_INTERVAL_IN_MILLISECONDS = 60 * 1000;

export const SyncNavLink = () => {
  const t = useTranslation('app');
  const theme = useTheme();
  const { syncStatus, numberOfRecordsInPushQueue } = useHost.utils.syncInfo(
    POLLING_INTERVAL_IN_MILLISECONDS
  );

  // the Badge does not show if the content is 0
  // somehow though the numberOfRecordsInPushQueue can be '0' which does show
  const badgeContent = (
    !numberOfRecordsInPushQueue
      ? 0
      : // parse, after casting to string to satisfy ts
        Number.parseFloat(`${numberOfRecordsInPushQueue}`)
  ) as React.ReactNode;

  const badgeProps = {
    badgeContent,
    max: 99,
    color: 'primary' as 'primary' | 'default',
  };

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
