import React from 'react';
import {
  Divider,
  MenuItem,
  StandardTextFieldProps,
  TextField,
} from '@mui/material';
import { useTranslation } from '@common/intl';
import { merge } from '@common/utils';

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

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    { options, renderOption, sx, slotProps, clearable = false, ...props },
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
        slotProps={merge(
          {
            input: {
              color: 'secondary',
              sx: {
                backgroundColor: props.disabled
                  ? 'background.toolbar'
                  : 'background.menu',
                borderRadius: 2,
                padding: '4px 8px',
              },
            },
            inputLabel: {
              color: 'secondary',
            },
          },
          slotProps
        )}
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
