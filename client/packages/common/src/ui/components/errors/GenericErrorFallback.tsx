import { Box, Grid, Tooltip, Typography } from '@mui/material';
import React, { FC } from 'react';
import { ErrorBoundaryFallbackProps } from './types';
import { UnhappyMan } from '@common/icons';
import { BaseButton } from '../buttons';
import { useTranslation } from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

export const GenericErrorFallback: FC<ErrorBoundaryFallbackProps> = ({
  onClearError,
}) => {
  const t = useTranslation();
  // Return to the app root, respecting the build-time base path so the sub-path
  // build ('/old-ui/') doesn't jump out to the root-served app. Default '/' is
  // unchanged.
  const dashboardUrl = `${window.location.origin}${Environment.PUBLIC_PATH}`;
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      height="100%"
      flex={1}
    >
      <UnhappyMan />
      <Typography style={{ padding: 20 }} variant="h3">
        {t('error.something-wrong')}
      </Typography>
      <Grid container gap={1} justifyContent="center">
        <BaseButton onClick={onClearError} color="secondary">
          {t('button.try-again')}
        </BaseButton>
        <Tooltip title={dashboardUrl}>
          <BaseButton
            color="secondary"
            onClick={() => {
              onClearError;
              window.location.href = dashboardUrl;
            }}
          >
            {t('button.dashboard')}
          </BaseButton>
        </Tooltip>
      </Grid>
    </Box>
  );
};
