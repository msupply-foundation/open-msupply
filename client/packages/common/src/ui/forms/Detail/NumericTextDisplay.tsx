import React, { FC } from 'react';
import { Box, SxProps, Tooltip, Typography } from '@mui/material';
import { useFormatNumber, useIntlUtils } from '@common/intl';
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
  packagingDisplay?: string;
  decimalLimit?: number;
  sx?: SxProps;
  roundUp?: boolean;
}

export const NumericTextDisplay: FC<NumericTextDisplayProps> = ({
  value,
  defaultValue = '',
  width = 50,
  packagingDisplay,
  decimalLimit = 2,
  sx,
  roundUp = false,
}) => {
  const format = useFormatNumber();
  const { isRtl } = useIntlUtils();
  const tooltip = value ? format.round(value ?? undefined, 10) : null;
  const formattedValue = roundUp
    ? format.roundUpToWholeNumber(value ?? 0)
    : format.round(value ?? 0, decimalLimit);

  const displayValue =
    value === undefined || value === null ? defaultValue : formattedValue;

  return (
    <Box sx={sx}>
      <Tooltip title={tooltip}>
        <Typography
          sx={{
            minWidth: width,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            // Keep numbers on the physical right in both directions so digits
            // line up by place value. A physical `right` gets flipped to `left`
            // by stylis-plugin-rtl, so use the logical edge that resolves to
            // the right in each direction (end in LTR, start in RTL).
            textAlign: isRtl ? 'start' : 'end',
            fontSize: 'inherit',
            color: 'inherit',
            paddingX: '1px', // so overflow hidden doesn't cut off last digit
          }}
        >
          {/* Show `...` if greater decimal precision available in tooltip */}
          {decimalLimit > 0 && // But only show `...` if there are some decimal places shown (`3... units` looks silly)
          !!NumUtils.hasMoreThanDp(value ?? 0, decimalLimit)
            ? `${displayValue}...`
            : displayValue}
          {packagingDisplay ? ` ${packagingDisplay}` : ''}
        </Typography>
      </Tooltip>
    </Box>
  );
};
