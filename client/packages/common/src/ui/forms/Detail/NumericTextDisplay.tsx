import React, { FC } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useFormatNumber } from '@common/intl';
import { NumUtils } from '@common/utils';

/*
Simple component for displaying numbers as text in a "form-like" layout
i.e. right-justified in a small fixed-width space
Can be used with Children <NumberTextDisplay>{value}</NumberTextDisplay>
or in "shorthand" style <NumberTextDislay value={value} />
*/

interface NumericTextDisplayProps {
  value?: number | null | undefined;
  defaultValue?: string | number;
  children?: React.ReactElement;
  width?: number | string;
}

export const NumericTextDisplay: FC<NumericTextDisplayProps> = ({
  value,
  defaultValue = '',
  width = 50,
}) => {
  const format = useFormatNumber();
  const tooltip = value ? format.round(value ?? undefined, 10) : null;
  const formattedValue = format.round(value ?? 0, 2);

  const displayValue =
    value === undefined || value === null ? defaultValue : formattedValue;

  return (
    <Box
      sx={{
        padding: '4px 8px',
      }}
    >
      <Tooltip title={tooltip}>
        <Typography
          style={{
            minWidth: width,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'right',
            fontSize: 'inherit',
          }}
        >
          {!!NumUtils.hasMoreThanTwoDp(value ?? 0)
            ? `${displayValue}...`
            : displayValue}
        </Typography>
      </Tooltip>
    </Box>
  );
};
