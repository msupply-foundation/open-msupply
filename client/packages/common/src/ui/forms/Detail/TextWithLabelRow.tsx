import React, { FC } from 'react';
import {
  FormLabel,
  Box,
  FormLabelProps,
  Typography,
  TypographyProps,
  SxProps,
  Theme,
} from '@mui/material';

interface TextWithLabelRowProps {
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string;
  text: string;
  textProps?: TypographyProps;
  sx?: SxProps<Theme>;
}

export const TextWithLabelRow: FC<TextWithLabelRowProps> = ({
  label,
  labelProps,
  labelWidth = '100px',
  text,
  textProps,
  sx,
}) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};
  return (
    <Box display="flex" sx={sx}>
      <Box style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
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
      <Box flex={1} sx={sx}>
        <Typography paddingRight={1.5} {...textProps}>
          {text}
        </Typography>
      </Box>
    </Box>
  );
};
