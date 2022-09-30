import React from 'react';
import {
  Box,
  useNotification,
  AlertIcon,
  Typography,
} from '@openmsupply-client/common';

export type ErrorWithDetailsProps = {
  error: string;
  details: string;
};

export const ErrorWithDetails: React.FC<ErrorWithDetailsProps> = ({
  error,
  details,
}) => {
  const n = useNotification();

  return (
    <Box display="flex" sx={{ color: 'error.main' }} gap={1}>
      <Box>
        <AlertIcon onClick={n.error(details)} />
      </Box>
      <Box>
        <Typography sx={{ color: 'inherit' }}>{error}</Typography>
      </Box>
    </Box>
  );
};
