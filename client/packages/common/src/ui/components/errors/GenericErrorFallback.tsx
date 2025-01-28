import { Box, Typography } from '@mui/material';
import React, { FC } from 'react';
import { ErrorBoundaryFallbackProps } from './types';
import { UnhappyMan } from '@common/icons';
import { useTranslation } from '@common/intl';
import { BaseButton } from '../buttons';

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
      <BaseButton onClick={onClearError}>{t('button.try-again')}</BaseButton>
    </Box>
  );
};
