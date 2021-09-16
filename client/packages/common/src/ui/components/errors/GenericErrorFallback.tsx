import { Box, Typography, Button } from '@material-ui/core';
import React, { FC } from 'react';
import { ErrorBoundaryFallbackProps } from './types';
import UnhappyMan from '../../icons/UnhappyMan';
import { useTranslation } from '../../../intl';

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
      <Button color="primary" variant="contained" onClick={onClearError}>
        {t('button.try-again')}
      </Button>
    </Box>
  );
};
