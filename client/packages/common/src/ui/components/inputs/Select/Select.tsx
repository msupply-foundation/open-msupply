import React, { FC } from 'react';
import { MenuItem, StandardTextFieldProps, TextField } from '@mui/material';

export type Option = {
  label: string;
  value: string | number;
};
export interface SelectProps extends StandardTextFieldProps {
  options: Option[];
  renderOption?: (option: Option) => React.ReactNode;
}

const defaultRenderOption = (option: Option) => (
  <MenuItem key={option.value} value={option.value}>
    {option.label}
  </MenuItem>
);

export const Select: FC<SelectProps> = React.forwardRef(
  ({ options, renderOption, sx, InputProps, ...props }, ref) => (
    <TextField
      ref={ref}
      sx={{
        '& .MuiInput-underline:before': { borderBottomWidth: 0 },
        '& .MuiInput-input': { color: theme => theme.palette.gray.dark },
        ...sx,
      }}
      select
      variant="standard"
      size="small"
      InputProps={{
        ...InputProps,
        color: 'secondary',
        sx: {
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
    >
      {options.map(renderOption || defaultRenderOption)}
    </TextField>
  )
);
