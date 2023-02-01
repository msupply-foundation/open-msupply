import React, { FC } from 'react';
import {
  Box,
  StandardTextFieldProps,
  TextField,
  Typography,
} from '@mui/material';

export type BasicTextInputProps = StandardTextFieldProps;

/**
 * Very basic TextInput component with some simple styling applied where you can
 * build your input on top.
 */

export const BasicTextInput: FC<BasicTextInputProps> = React.forwardRef(
  ({ sx, InputProps, error, required, ...props }, ref) => (
    <Box display="flex" justifyContent="flex-end" alignItems="center">
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
      <Box width={2}>
        {required && (
          <Typography
            sx={{
              color: 'primary.light',
              fontSize: '17px',
              marginRight: 0.5,
            }}
          >
            *
          </Typography>
        )}
      </Box>
    </Box>
  )
);
