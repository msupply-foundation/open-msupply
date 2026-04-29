import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { BaseButton, useQueryClient } from '@openmsupply-client/common';
import { UnhappyMan } from '@common/icons';
import { useTranslation } from '@common/intl';

/**
 * Full-page gate shown when the bootstrap query (migrationStatus)
 * fails with a NetworkError. Rendered instead of the rest of the app,
 * since other queries down the tree need the same connection and
 * would either error or render with stale/empty data. Mirrors
 * GenericErrorFallback so a connection failure looks like the same
 * "we ran into a problem" surface the user sees for unhandled errors.
 */
export const ConnectionLostPage = () => {
  const t = useTranslation();
  const queryClient = useQueryClient();

  const onRetry = () => {
    queryClient.invalidateQueries('migrationStatus');
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      flex={1}
      role="alert"
      aria-live="assertive"
    >
      <UnhappyMan />
      <Typography style={{ padding: 20 }} variant="h3">
        {t('error.connection-error')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ pb: 2 }}>
        {t('error.connection-error-hint')}
      </Typography>
      <Grid container gap={1} justifyContent="center">
        <BaseButton onClick={onRetry} color="secondary">
          {t('button.try-again')}
        </BaseButton>
      </Grid>
    </Box>
  );
};
