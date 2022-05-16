import React, { FC } from 'react';
import { StandardTextFieldProps, NumericTextInput } from '@openmsupply-client/common';

export const InitialiseNumericInput: FC<StandardTextFieldProps> = React.forwardRef(
    ({ sx, InputProps, error, ...props }, ref) => (
      <NumericTextInput
        ref={ref}
        sx={{
          '& .MuiInput-underline:before': { borderBottomWidth: 0 },
          '& .MuiInput-input': { color: 'gray.dark' },
          '& label': {
            color: theme => `${theme.palette.gray.main}!important`,
            fontSize: '16px',
            paddingLeft: '10px',
          },
          ...sx,
        }}
        variant="standard"
        focused
        size="small"
        InputProps={{
          disableUnderline: true,
          ...InputProps,
          sx: {
            border: theme =>
              error
                ? `2px solid ${theme.palette.error.main}`
                : `1px solid ${theme.palette.border}`,
            backgroundColor: theme =>
              props.disabled
                ? theme.palette.background.toolbar
                : theme.palette.background.white,
            borderRadius: '8px',
            padding: '4px 8px',
            ...InputProps?.sx,
          },
        }}
        {...props}
      />
    )
  );