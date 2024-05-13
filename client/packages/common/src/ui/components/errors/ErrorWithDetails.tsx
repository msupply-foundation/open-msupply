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
  const TooltipContents = () => {
    const sx = { color: 'inherit', fontSize: 'inherit' };

    return (
      <Box display="flex" flexDirection="column" gap={1}>
        {!!hint && (
          <Typography sx={{ fontWeight: 'bold', ...sx }}>{hint}</Typography>
        )}

        {!!details && <Typography sx={sx}>{details}</Typography>}
      </Box>
    );
  };

  return (
    <Tooltip title={!details && !hint ? null : <TooltipContents />}>
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
