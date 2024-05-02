import { Box, Grid, Typography } from '@mui/material';
import React, { FC } from 'react';
import { ErrorBoundaryFallbackProps } from './types';
import { UnhappyMan } from '@common/icons';
import { BaseButton } from '../buttons';
import { useTranslation } from '@openmsupply-client/common';

export const GenericErrorFallback: FC<ErrorBoundaryFallbackProps> = ({
  onClearError,
}) => {
  const t = useTranslation();
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
        <BaseButton onClick={onClearError}>{t('button.try-again')}</BaseButton>
        <BaseButton
          onClick={() => {
            onClearError;
            window.location.href = window.location.origin;
          }}
        >
          {t('button.home')}
        </BaseButton>
      </Grid>
    </Box>
  );
};
