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
  labelWidthPercentage?: number;
  labelProps?: FormLabelProps;
  inputProps?: StandardTextFieldProps;
}

export const DetailInputWithLabelRow: FC<InputWithLabelRowProps> = ({
  label,
  labelWidthPercentage = 40,
  inputProps,
  Input = <BasicTextInput {...inputProps} />,
  DisabledInput = <BasicTextInput {...inputProps} />,
  labelProps,
}) => {
  const { sx, ...labelPropsRest } = labelProps || {};
  const isDisabled = inputProps?.disabled;
  const labelFlexBasis = `${labelWidthPercentage}%`;
  const inputFlexBasis = `${100 - labelWidthPercentage}%`;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
    >
      <Box flex={1} style={{ textAlign: 'end' }} flexBasis={labelFlexBasis}>
        <FormLabel sx={{ fontWeight: 'bold', ...sx }} {...labelPropsRest}>
          {label}:
        </FormLabel>
      </Box>
      <Box flex={1} flexBasis={inputFlexBasis}>
        {!isDisabled ? Input : DisabledInput}
      </Box>
    </Box>
  );
};
