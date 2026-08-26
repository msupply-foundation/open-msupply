import { Box, Typography, useTranslation } from '@openmsupply-client/common';
import React from 'react';
import { FORM_LABEL_WIDTH } from '../styleConstants';

interface PreviousValueDisplayProps<T> {
  date: string;
  label?: string;
  value: T;
  sx?: React.CSSProperties;
  labelWidthPercentage?: number;
}

// Component mimics the structure of DetailInputWithLabelRow to keep content
// aligned with the *content* of the original input, but with no label

export const PreviousValueDisplay = <T,>({
  date,
  value,
  label,
  sx,
  labelWidthPercentage = FORM_LABEL_WIDTH,
}: PreviousValueDisplayProps<T>) => {
  const t = useTranslation();

  if (React.isValidElement(value)) return value;

  const labelFlexBasis = `${labelWidthPercentage}%`;

  return (
    <Box
      display="flex"
      className="input-with-label-row"
      alignItems="center"
      gap={1}
      sx={{ ...sx }}
    >
      {/* Dummy box for label spacing */}
      <Box style={{ textAlign: 'end' }} flexBasis={labelFlexBasis} />
      <Box>
        <Typography sx={{ whiteSpace: 'pre', fontSize: '90%' }}>
          <strong>
            {t('control.from-previous-encounter', {
              label,
              date: `${new Date(date).toLocaleDateString()}`,
            })}
          </strong>
          <br />
          {String(value)}
        </Typography>
      </Box>
    </Box>
  );
};
