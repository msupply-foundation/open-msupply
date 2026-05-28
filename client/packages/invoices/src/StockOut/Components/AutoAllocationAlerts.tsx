import React from 'react';
import { Alert, Grid, SxProps, Theme } from '@openmsupply-client/common';
import { useAllocationContext } from '../useAllocationContext';

export const AutoAllocationAlerts = ({ sx }: { sx?: SxProps<Theme> }) => {
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
      sx={sx}
    >
      {alerts.map(({ message, severity }) => (
        <Alert severity={severity} key={message}>
          {message}
        </Alert>
      ))}
    </Grid>
  );
};
