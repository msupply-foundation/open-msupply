import React from 'react';
import { Alert, Grid } from '@openmsupply-client/common';
import { useAllocationContext } from '../useAllocationContext';

export const AutoAllocationAlerts = () => {
  const { alerts } = useAllocationContext(({ alerts }) => ({
    alerts,
  }));
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
