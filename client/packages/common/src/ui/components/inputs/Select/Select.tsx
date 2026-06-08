import React from 'react';
import {
  Divider,
  MenuItem,
  OutlinedTextFieldProps,
  TextField,
} from '@mui/material';
import { useTranslation } from '@common/intl';
import { merge } from '@common/utils';

export type Option = {
  label: string;
  value: string | number;
  disabled?: boolean;
};
export interface SelectProps extends Omit<OutlinedTextFieldProps, 'variant'> {
  options: Option[];
  renderOption?: (option: Option) => React.ReactNode;
  clearable?: boolean;
}

const defaultRenderOption = (option: Option) => (
  <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
    {option.label}
  </MenuItem>
);

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    { options, renderOption, sx, slotProps, clearable = false, ...props },
    ref
  ) => {
    const t = useTranslation();

    return (
      <TextField
        ref={ref}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: props.disabled ? 'rgba(0, 0, 0, 0.04)' : '#ffffff',
          },
          ...sx,
        }}
        select
        variant="outlined"
        size="small"
        color="primary"
        slotProps={merge(
          {
            inputLabel: { color: 'primary' },
          },
          slotProps
        )}
        {...props}
      >
        {options.map(renderOption || defaultRenderOption)}
        {clearable && <Divider />}
        {clearable && (
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
