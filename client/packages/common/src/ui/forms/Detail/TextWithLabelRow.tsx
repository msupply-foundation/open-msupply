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
  sensorStyle?: boolean;
}

export const TextWithLabelRow: FC<TextWithLabelRowProps> = ({
  label,
  labelProps,
  labelWidth = '100px',
  text,
  textProps,
  sensorStyle,
}) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};
  return (
    <Box display="flex">
      <Box
        style={sensorStyle ? {} : { textAlign: 'end', whiteSpace: 'nowrap' }}
      >
        <FormLabel
          sx={{
            fontWeight: 'bold',
            display: 'inline-block',
            width: labelWidth,
            ...labelSx,
          }}
          {...labelPropsRest}
        >
          {label}:
        </FormLabel>
      </Box>
      <Box flex={1}>
        <Typography paddingRight={1.5} {...textProps}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
};
