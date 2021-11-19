import React, { FC, ReactNode } from 'react';
import { FormLabel, Box, FormLabelProps } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';

interface InputWithLabelRowProps {
  Input: ReactNode;
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string | null;
}

export const InputWithLabelRow: FC<InputWithLabelRowProps> = ({
  label,
  Input = <BasicTextInput />,
  labelProps,
  labelWidth = '120px',
}) => {
  const { sx, ...labelPropsRest } = labelProps || {};

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <FormLabel
        sx={{ width: labelWidth, fontWeight: 'bold', ...sx }}
        {...labelPropsRest}
      >
        {label}:
      </FormLabel>
      {Input}
    </Box>
  );
};
