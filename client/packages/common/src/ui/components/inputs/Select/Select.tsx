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
  disabled?: boolean;
  /** Optional test id stamped on the rendered option (e.g. e2e filter ids). */
  testId?: string;
};
export interface SelectProps extends StandardTextFieldProps {
  options: Option[];
  renderOption?: (option: Option) => React.ReactNode;
  clearable?: boolean;
}

const defaultRenderOption = (option: Option) => (
  <MenuItem
    key={option.value}
    value={option.value}
    disabled={option.disabled}
    data-testid={option.testId}
  >
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
                  ? 'background.input.disabled'
                  : 'background.input.main',
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
