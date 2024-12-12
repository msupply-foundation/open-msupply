import React, { FC } from 'react';
import {
  FormLabel,
  Box,
  FormLabelProps,
  Typography,
  TypographyProps,
  SxProps,
  Theme,
  Tooltip,
} from '@mui/material';
interface TextWithLabelRowProps {
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string;
  text: string;
  textProps?: TypographyProps;
  sx?: SxProps<Theme>;
  showToolTip?: boolean;
}

export const TextWithLabelRow: FC<TextWithLabelRowProps> = ({
  label,
  labelProps,
  labelWidth = '100px',
  text,
  textProps,
  sx,
  showToolTip,
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
        <Tooltip title={showToolTip ? text : ''} placement="right">
          <Typography paddingRight={1.5} {...textProps}>
            {text}
          </Typography>
        </Tooltip>
      </Box>
    </Box>
  );
};
