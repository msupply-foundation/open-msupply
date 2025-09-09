import React from 'react';
import MuiToggleButton from '@mui/material/ToggleButton';
import MuiToggleButtonGroup, {
  ToggleButtonGroupProps as MuiProps,
} from '@mui/material/ToggleButtonGroup';

interface ToggleButtonGroupProps<T> {
  value: T | null;
  onChange: (value: T) => void;
  options: { id: string; value: T; icon: React.ReactNode; label: string }[];
  color?: MuiProps['color'];
}

export const ToggleButtonGroup = <T extends string>({
  value,
  onChange,
  options,
  color = 'secondary',
}: ToggleButtonGroupProps<T>) => (
  <MuiToggleButtonGroup
    color={color}
    value={value}
    exclusive
    onChange={(_, value) => onChange(value as T)}
  >
    {options.map(option => (
      <MuiToggleButton
        key={option.id}
        value={option.value}
        aria-label={option.label}
        sx={{ padding: '0 5px' }}
      >
        {option.icon}
      </MuiToggleButton>
    ))}
  </MuiToggleButtonGroup>
);
