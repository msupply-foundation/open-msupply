import React, { FC } from 'react';
import {
  FormLabel,
  Box,
  FormLabelProps,
  Typography,
  TypographyProps,
} from '@mui/material';

interface TextWithLabelRowProps {
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string;
  text: string;
  textProps?: TypographyProps;
}

export const TextWithLabelRow: FC<TextWithLabelRowProps> = ({
  label,
  labelProps,
  labelWidth = '100px',
  text,
  textProps,
}) => {
  const { sx, ...labelPropsRest } = labelProps || {};
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
        <FormLabel
          sx={{
            fontWeight: 'bold',
            display: 'inline-block',
            width: labelWidth,
            ...sx,
          }}
          {...labelPropsRest}
        >
          {label}:
        </FormLabel>
      </Box>
      <Box>
        <Typography paddingRight={1.5} {...textProps}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
};
