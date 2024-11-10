import React from 'react';
import { Box, Typography } from '@openmsupply-client/common';
import { useFormatNumber } from '@common/intl';

const MIN_FLEX_BASIS_TO_SHOW_VALUE = 5;

interface ValueBarProps {
  value: number;
  total: number;
  colour: string;
}

export const NewValueBar = ({ value, total, colour }: ValueBarProps) => {
  const formatNumber = useFormatNumber();
  if (value === 0) return null;

  const flexBasis = Math.min(Math.round((100 * value) / total), 100);

  return (
    <>
      <Box display="flex" flexDirection="column" width="100%">
        <Box flexBasis={`${flexBasis}%`} flexGrow={1}>
          <Box sx={{ backgroundColor: colour, height: '20px' }}>
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_VALUE ? (
              <Typography
                fontSize={12}
                sx={{
                  color: 'primary.contrastText',
                  flex: 1,
                  justifyContent: 'center',
                  display: 'flex',
                  fontWeight: 'bold',
                }}
                component="div"
              >
                {formatNumber.round(value)}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>
    </>
  );
};
