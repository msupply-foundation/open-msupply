import React from 'react';
import { StockOutAlert } from '.';
import { useTranslation } from '@common/intl';
import { Alert, Grid } from '@openmsupply-client/common';

export const StockOutAlerts = ({
  allocationAlerts,
  showZeroQuantityConfirmation,
  isAutoAllocated,
}: {
  allocationAlerts: StockOutAlert[];
  showZeroQuantityConfirmation: boolean;
  isAutoAllocated: boolean;
}) => {
  const t = useTranslation();
  const alerts: StockOutAlert[] = showZeroQuantityConfirmation
    ? [
        {
          message: t('messages.confirm-zero-quantity'),
          severity: 'warning',
        },
      ]
    : isAutoAllocated
      ? allocationAlerts
      : [];

  if (alerts.length === 0) return null;

  return (
    <Grid
      display="flex"
      justifyContent="center"
      flex={1}
      paddingTop={0.5}
      paddingBottom={0.5}
      flexDirection="column"
      gap={0.5}
    >
      {alerts.map(({ message, severity }) => (
        <Alert severity={severity} key={message}>
          {message}
        </Alert>
      ))}
    </Grid>
  );
};
