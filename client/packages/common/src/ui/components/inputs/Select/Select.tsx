import React, { FC } from 'react';
import {
  Divider,
  MenuItem,
  StandardTextFieldProps,
  TextField,
} from '@mui/material';
import { useTranslation } from '@common/intl';

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
    { options, renderOption, sx, InputProps, clearable = false, ...props },
    ref
  ) => {
    const t = useTranslation();

    const showClearOption =
      !!props?.value && !!props?.onChange && clearable && options.length > 1;

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
        {showClearOption && <Divider />}
        {showClearOption && (
          <MenuItem
            key={'clear-filters'}
            onClick={() =>
              props.onChange?.({
                target: { value: '' },
              } as React.ChangeEvent<HTMLInputElement>)
            }
          >
            {t('label.clear-selection')}
          </MenuItem>
        )}
      </TextField>
    );
  }
);
