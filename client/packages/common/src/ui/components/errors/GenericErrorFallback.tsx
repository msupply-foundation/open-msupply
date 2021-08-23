import { Box, Typography, Button } from '@material-ui/core';
import React, { FC } from 'react';
import { ErrorBoundaryFallbackProps } from './types';
import UnhappyMan from '../../icons/UnhappyMan';

export const GenericErrorFallback: FC<ErrorBoundaryFallbackProps> = ({
  onClearError,
}) => {
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
      <Typography variant="h3">Oops! Somethings gone wrong.</Typography>
      <Button color="primary" variant="contained" onClick={onClearError}>
        Try again!
      </Button>
    </Box>
  );
};
