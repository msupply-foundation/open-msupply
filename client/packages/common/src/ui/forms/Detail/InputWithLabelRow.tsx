import React, { FC, ReactNode } from 'react';
import {
  FormLabel,
  Box,
  FormLabelProps,
  StandardTextFieldProps,
  Typography,
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
  DisabledInput = <Typography>{inputProps?.value as string}</Typography>,
  labelProps,
}) => {
  const { sx, ...labelPropsRest } = labelProps || {};
  const isDisabled = inputProps?.disabled;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box style={{ textAlign: 'end' }} flexBasis="40%">
        <FormLabel sx={{ fontWeight: 'bold', ...sx }} {...labelPropsRest}>
          {label}:
        </FormLabel>
      </Box>
      <Box flexBasis="60%" justifyContent="flex-end" display="flex">
        {!isDisabled ? Input : DisabledInput}
      </Box>
    </Box>
  );
};
