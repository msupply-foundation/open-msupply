import React from 'react';
import {
  Box,
  AlertIcon,
  Typography,
  Tooltip,
  InfoIcon,
} from '@openmsupply-client/common';

export type ErrorWithDetailsProps = {
  error: string;
  details: string;
  hint?: string;
};

export const ErrorWithDetails: React.FC<ErrorWithDetailsProps> = ({
  error,
  details,
  hint,
}) => {
  const sx = { color: 'inherit', fontSize: 'inherit' };
  const TooltipContents = () => {
    if (!details && !hint) {
      return null;
    }

    return (
      <Box display="flex" flexDirection="column" gap={1}>
        {!!hint && <Typography sx={sx}>{hint}</Typography>}

        {!!details && (
          <Box>
            <Typography sx={sx}>Error Details:</Typography>
            <Typography sx={sx}>{details}</Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Tooltip title={<TooltipContents />}>
      <Box
        display="flex"
        sx={{ color: 'error.main' }}
        gap={1}
        justifyContent="center"
      >
        <Box display="flex" flexWrap="wrap" alignContent="center">
          <AlertIcon />
        </Box>
        <Box sx={{ '& > div': { display: 'inline-block' } }}>
          <Typography sx={{ color: 'inherit' }} component="span">
            {error}
          </Typography>
          {!!(details || hint) && <InfoIcon fontSize="inherit" />}
        </Box>
      </Box>
    </Tooltip>
  );
};
