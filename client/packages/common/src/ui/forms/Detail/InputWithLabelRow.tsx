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
  inputAlignment = 'end',
  inputProps,
  Input = <BasicTextInput fullWidth {...inputProps} />,
  DisabledInput = <BasicTextInput fullWidth {...inputProps} />,
  labelProps,
}) => {
  const { sx: labelSx, ...labelPropsRest } = labelProps || {};
  const isDisabled = inputProps?.disabled;
  const labelFlexBasis = `${labelWidthPercentage}%`;
  const inputFlexBasis = `${100 - labelWidthPercentage}%`;
  const justify = `flex-${inputAlignment}`;

  return (
    <Box
      display="flex"
      // This class allows JSONForms to target the layout styling :)
      className="input-with-label-row"
      alignItems="center"
      gap={1}
      sx={{ ...sx }}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={labelFlexBasis}>
        <FormLabel sx={{ fontWeight: 'bold', ...labelSx }} {...labelPropsRest}>
          {labelWithPunctuation(label)}
        </FormLabel>
      </Box>
      <Box flexBasis={inputFlexBasis} justifyContent={justify} display="flex">
        {!isDisabled ? Input : DisabledInput}
      </Box>
    </Box>
  );
};

// Adds a final ":" to the label, but not if it already ends in "?" or ":", or
// if there is no label value
export const labelWithPunctuation = (labelString: string) => {
  if (/[\?:]$/.test(labelString)) return labelString;
  if (labelString === '') return '';
  else return labelString + ':';
};
