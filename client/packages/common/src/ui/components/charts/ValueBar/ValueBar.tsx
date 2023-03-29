import React, { FC } from 'react';
import { Box, Tooltip, Typography } from '@openmsupply-client/common';
import { useFormatNumber } from '@common/intl';

const MIN_FLEX_BASIS_TO_SHOW_LABEL = 10;
const MIN_FLEX_BASIS_TO_SHOW_VALUE = 5;

const Divider = () => (
  <Box sx={{ backgroundColor: 'gray.dark', width: '1px', height: '45px' }} />
);

interface ValueBarProps {
  value: number;
  total: number;
  label: string;
  colour: string;
  startDivider?: boolean;
  endDivider?: boolean;
}

export const ValueBar: FC<ValueBarProps> = ({
  value,
  total,
  label,
  colour,
  startDivider = false,
  endDivider = true,
}) => {
  const formatNumber = useFormatNumber();
  if (value === 0) return startDivider ? <Divider /> : null;

  const flexBasis = Math.min(Math.round((100 * value) / total), 100);

  return (
    <>
      {startDivider ? <Divider /> : null}
      <Tooltip title={`${label}: ${formatNumber.round(value)}`} placement="top">
        <Box flexBasis={`${flexBasis}%`} flexGrow={1}>
          <Box sx={{ backgroundColor: colour, height: '20px' }} />
          <Box
            style={{
              textAlign: 'end',
              paddingRight: 10,
              paddingTop: 10,
            }}
          >
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_LABEL ? (
              <Typography
                fontSize={12}
                style={{ textOverflow: 'ellipsis', height: 20 }}
              >
                {label}
              </Typography>
            ) : null}
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_VALUE ? (
              <Typography fontSize={12}>{formatNumber.round(value)}</Typography>
            ) : null}
          </Box>
        </Box>
      </Tooltip>
      {endDivider ? <Divider /> : null}
    </>
  );
};
