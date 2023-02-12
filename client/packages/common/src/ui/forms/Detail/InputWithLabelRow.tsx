import React, { FC, ReactNode } from 'react';
import {
  FormLabel,
  Box,
  FormLabelProps,
  StandardTextFieldProps,
  SxProps,
  Theme,
} from '@mui/material';
import { BasicTextInput } from '@common/components';

interface InputWithLabelRowProps {
  sx?: SxProps<Theme>;
  Input?: ReactNode;
  DisabledInput?: ReactNode;
  label: string;
  labelWidthPercentage?: number;
  labelProps?: FormLabelProps;
  inputProps?: StandardTextFieldProps;
  /** flex-{$inputAlignment} alignment of the input field  */
  inputAlignment?: 'start' | 'end';
}

export const DetailInputWithLabelRow: FC<InputWithLabelRowProps> = ({
  sx,
  label,
  labelWidthPercentage = 40,
  inputAlignment,
  inputProps,
  Input = <BasicTextInput {...inputProps} />,
  DisabledInput = <BasicTextInput {...inputProps} />,
  labelProps,
}) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};
  const isDisabled = inputProps?.disabled;
  const labelFlexBasis = `${labelWidthPercentage}%`;
  const inputFlexBasis = `${100 - labelWidthPercentage}%`;

  return (
    <Box display="flex" alignItems="center" gap={1} sx={{ ...sx }}>
      <Box style={{ textAlign: 'end' }} flexBasis={labelFlexBasis}>
        <FormLabel sx={{ fontWeight: 'bold', ...labelSx }} {...labelPropsRest}>
          {label}:
        </FormLabel>
      </Box>
      <Box
        flexBasis={inputFlexBasis}
        justifyContent={inputAlignment ? `flex-${inputAlignment}` : 'flex-end'}
        display="flex"
      >
        {!isDisabled ? Input : DisabledInput}
      </Box>
    </Box>
  );
};
