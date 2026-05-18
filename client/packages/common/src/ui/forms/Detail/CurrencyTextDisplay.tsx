import React, { FC } from 'react';
import { Box, SxProps, Tooltip, Typography } from '@mui/material';
import { Currencies, useCurrency } from '@common/intl';

interface CurrencyTextDisplayProps {
  value: number;
  currencyCode?: Currencies;
  width?: number | string;
  sx?: SxProps;
}

export const CurrencyTextDisplay: FC<CurrencyTextDisplayProps> = ({
  value,
  currencyCode,
  width = 150,
  sx,
}) => {
  const { c } = useCurrency(currencyCode);
  const displayValue = c(value).format();
  const tooltipValue = c(value, 10).format();

  return (
    <Box sx={sx}>
      <Tooltip title={tooltipValue}>
        <Typography
          sx={{
            minWidth: width,
            textAlign: 'right',
            fontSize: 'inherit',
            paddingX: '8px',
            paddingY: '4px',
          }}
        >
          {displayValue}
        </Typography>
      </Tooltip>
    </Box>
  );
};
