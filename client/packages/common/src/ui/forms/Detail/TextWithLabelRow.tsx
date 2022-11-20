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
  text: string;
  textProps?: TypographyProps;
}

export const TextWithLabelRow: FC<TextWithLabelRowProps> = ({
  label,
  labelProps,
  text,
  textProps,
}) => {
  const { sx, ...labelPropsRest } = labelProps || {};
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box style={{ textAlign: 'end', whiteSpace: 'nowrap' }} flexBasis="40%">
        <FormLabel sx={{ fontWeight: 'bold', ...sx }} {...labelPropsRest}>
          {label}:
        </FormLabel>
      </Box>
      <Box flexBasis="60%">
        <Typography paddingRight={1.5} {...textProps}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
};
