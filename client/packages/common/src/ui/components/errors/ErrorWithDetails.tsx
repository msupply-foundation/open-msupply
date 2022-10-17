import React from 'react';
import {
  Box,
  AlertIcon,
  Typography,
  InfoTooltipIcon,
} from '@openmsupply-client/common';

export type ErrorWithDetailsProps = {
  error: string;
  details: string;
};

export const ErrorWithDetails: React.FC<ErrorWithDetailsProps> = ({
  error,
  details,
}) => (
  <Box
    display="flex"
    sx={{ color: 'error.main' }}
    gap={1}
    padding={2}
    justifyContent="center"
  >
    <Box>
      <AlertIcon />
    </Box>
    <Box>
      <Typography sx={{ color: 'inherit' }}>{error}</Typography>
    </Box>
    <Box>
      <InfoTooltipIcon title={details} />
    </Box>
  </Box>
);
