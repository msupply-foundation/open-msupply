import React, { FC } from 'react';
import {
  Box,
  StandardTextFieldProps,
  SxProps,
  TextField,
  Theme,
  Typography,
} from '@mui/material';

export interface BasicTextInputProps extends StandardTextFieldProps {
  boxSx?: SxProps<Theme>;
}

/**
 * Very basic TextInput component with some simple styling applied where you can
 * build your input on top.
 */

export const BasicTextInput: FC<BasicTextInputProps> = React.forwardRef(
  ({ sx, InputProps, error, required, boxSx, ...props }, ref) => (
    <Box sx={{ ...boxSx }}>
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
