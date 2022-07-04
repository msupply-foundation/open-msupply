import React, { FC, ReactNode } from 'react';
import {
  FormLabel,
  Box,
  FormLabelProps,
  StandardTextFieldProps,
} from '@mui/material';
import { BasicTextInput } from '@common/components';

interface InputWithLabelRowProps {
  Input?: ReactNode;
  DisabledInput?: ReactNode;
  label: string;
  labelProps?: FormLabelProps;
  inputProps?: StandardTextFieldProps;
}

export const DetailInputWithLabelRow: FC<InputWithLabelRowProps> = ({
  label,
  inputProps,
  Input = <BasicTextInput {...inputProps} />,
  DisabledInput = <BasicTextInput {...inputProps} />,
  labelProps,
}) => {
  const { sx, ...labelPropsRest } = labelProps || {};
  const isDisabled = inputProps?.disabled;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
    >
      <Box flex={1} style={{ textAlign: 'end' }} flexBasis="40%">
        <FormLabel sx={{ fontWeight: 'bold', ...sx }} {...labelPropsRest}>
          {label}:
        </FormLabel>
      </Box>
      <Box flex={1} flexBasis="60%">
        {!isDisabled ? Input : DisabledInput}
      </Box>
    </Box>
  );
};
