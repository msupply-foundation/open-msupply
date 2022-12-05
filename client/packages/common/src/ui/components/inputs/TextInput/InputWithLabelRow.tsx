import React, { FC, ReactNode } from 'react';
import { FormLabel, Box, FormLabelProps, SxProps, Theme } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';

export interface InputWithLabelRowProps {
  Input: ReactNode;
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string | null;
  sx?: SxProps<Theme>;
}

export const InputWithLabelRow: FC<InputWithLabelRowProps> = ({
  label,
  Input = <BasicTextInput />,
  labelProps,
  labelWidth = '120px',
  sx,
}) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};

  return (
    <Box display="flex" alignItems="center" gap={1} sx={sx}>
      <FormLabel
        sx={{ width: labelWidth, fontWeight: 'bold', ...labelSx }}
        {...labelPropsRest}
      >
        {label}:
      </FormLabel>
      {Input}
    </Box>
  );
};
