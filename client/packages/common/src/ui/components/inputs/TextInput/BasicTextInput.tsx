import React, { FC } from 'react';
import { StandardTextFieldProps, TextField } from '@mui/material';

export type BasicTextInputProps = StandardTextFieldProps;

/**
 * Very basic TextInput component with some simple styling applied where you can
 * build your input on top.
 */

export const BasicTextInput: FC<BasicTextInputProps> = React.forwardRef(
  ({ sx, InputProps, error, ...props }, ref) => (
    <TextField
      ref={ref}
      color="secondary"
      sx={{
        '& .MuiInput-underline:before': { borderBottomWidth: 0 },
        '& .MuiInput-input': { color: 'gray.dark' },
        ...sx,
      }}
      variant="standard"
      size="small"
      InputProps={{
        disableUnderline: error ? true : false,
        ...InputProps,
        sx: {
          border: theme =>
            error ? `2px solid ${theme.palette.error.main}` : 'none',
          backgroundColor: theme =>
            props.disabled
              ? theme.palette.background.toolbar
              : theme.palette.background.menu,
          borderRadius: '8px',
          padding: '4px 8px',
          ...InputProps?.sx,
        },
      }}
      {...props}
    />
  )
);
