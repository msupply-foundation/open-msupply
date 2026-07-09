import React from 'react';
import {
  NumericTextInput,
  NumericTextInputProps,
} from '@openmsupply-client/common';

// NumericTextInput styled to match LoginTextInput, for numeric fields on the
// login/initialise screens (which have their own input look).
export const LoginNumericTextInput = ({
  disabled,
  ...props
}: NumericTextInputProps) => (
  <NumericTextInput
    focused
    disabled={disabled}
    sx={{
      '& .MuiInput-input': { color: 'gray.dark' },
      '& label': {
        color: theme => `${theme.palette.gray.main}!important`,
        fontSize: '16px',
        paddingLeft: '10px',
      },
    }}
    slotProps={{
      input: {
        disableUnderline: true,
        sx: {
          border: theme => `1px solid ${theme.palette.border}`,
          backgroundColor: theme =>
            disabled
              ? theme.palette.background.toolbar
              : theme.palette.background.white,
          borderRadius: '8px',
          padding: '4px 8px',
        },
      },
      htmlInput: {
        sx: { backgroundColor: 'transparent' },
      },
    }}
    {...props}
  />
);
