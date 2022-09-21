import React, { FC } from 'react';
import { MenuItem, StandardTextFieldProps, TextField } from '@mui/material';
import { CloseIcon } from '../../../icons/Close';

export type Option = {
  label: string;
  value: string | number;
};
export interface SelectProps extends StandardTextFieldProps {
  options: Option[];
  renderOption?: (option: Option) => React.ReactNode;
  clearable?: boolean;
}

const defaultRenderOption = (option: Option) => (
  <MenuItem key={option.value} value={option.value}>
    {option.label}
  </MenuItem>
);

export const Select: FC<SelectProps> = React.forwardRef(
  (
    {
      options,
      renderOption,
      sx,
      InputProps,
      clearable = false,
      value,
      onChange = () => {},
      ...props
    },
    ref
  ) => {
    const SelectProps =
      clearable && value
        ? {
            IconComponent: () => (
              // Element to clear current selection.
              <CloseIcon
                onClick={e =>
                  onChange({ ...e, target: { value: undefined } } as any)
                }
                style={{
                  fontSize: '1em',
                  cursor: 'pointer',
                  color: 'rgba(0, 0, 0, 0.54);',
                }}
              />
            ),
          }
        : {};

    return (
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
          disableUnderline: true,
          ...InputProps,
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
        SelectProps={SelectProps}
        value={value}
        onChange={onChange}
        {...props}
      >
        {options.map(renderOption || defaultRenderOption)}
      </TextField>
    );
  }
);
