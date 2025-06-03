import React, { ReactNode } from 'react';
import { FormLabel, Box, FormLabelProps, SxProps, Theme } from '@mui/material';
import { BasicTextInput } from './BasicTextInput';

export interface InputWithLabelRowProps {
  Input: ReactNode;
  label: string;
  labelProps?: FormLabelProps;
  labelWidth?: string | null;
  labelRight?: boolean;
  sx?: SxProps<Theme>;
}

export const InputWithLabelRow = ({
  label,
  Input = <BasicTextInput />,
  labelProps,
  labelWidth = '120px',
  labelRight = false,
  sx,
}: InputWithLabelRowProps) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...(labelRight
          ? { gap: 2, flexDirection: 'row-reverse', justifyContent: 'flex-end' }
          : {}),
        ...sx,
      }}
    >
      <FormLabel
        sx={{ width: labelWidth, fontWeight: 'bold', ...labelSx }}
        {...labelPropsRest}
      >
        {label}
        {labelRight ? '' : ':'}
      </FormLabel>
      {Input}
    </Box>
  );
};
