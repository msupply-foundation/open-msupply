import React from 'react';
import {
  FormControlLabel,
  Switch as MuiSwitch,
  SxProps,
  Theme,
} from '@mui/material';

type LabelPlacement = 'bottom' | 'end' | 'start' | 'top';
type SwitchColor =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'error'
  | 'warning'
  | 'default'
  | 'gray';
interface SwitchProps {
  checked?: boolean;
  color?: SwitchColor;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: JSX.Element | number | string;
  labelPlacement?: LabelPlacement;
  onChange?: (
    event: React.SyntheticEvent<Element, Event>,
    checked: boolean
  ) => void;
  size?: 'medium' | 'small';
  value?: unknown;
  switchSx?: SxProps;
  labelSx?: SxProps;
}

const getLabelStyle = (
  labelPlacement: LabelPlacement,
  size: 'medium' | 'small'
) => {
  const margin = size === 'medium' ? '0' : '3px';
  switch (labelPlacement) {
    case 'end':
      return { marginInlineStart: margin };
    case 'start':
      return { marginInlineEnd: margin };
    default:
      return {};
  }
};

const getTrackBorderColor = (color?: SwitchColor) => (theme: Theme) => {
  switch (color) {
    case 'gray':
      return theme.palette.gray.dark;
    case 'secondary':
      return theme.palette.secondary.dark;
    default:
      return theme.palette.primary.dark;
  }
};

export const Switch = ({
  checked,
  color,
  defaultChecked,
  disabled,
  label,
  labelPlacement = 'start',
  onChange,
  size = 'medium',
  value,
  switchSx,
  labelSx,
}: SwitchProps) => {
  const isSmall = size === 'small';
  const switchStyle = {
    width: isSmall ? '40px' : '70px',
    padding: isSmall ? '1px' : '6px 12px',
    '& .MuiSwitch-switchBase': {
      paddingLeft: isSmall ? '3px' : '15px',
      right: 'auto', // emotion is setting this and making a mess
    },
    '& .MuiSwitch-thumb': {
      color: disabled ? 'gray.light' : 'gray.main',
    },
    '& .Mui-checked .MuiSwitch-thumb': {
      color: 'inherit',
    },
    '& .MuiSwitch-track': {
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: 'gray.main',
      backgroundColor: '#fff',
      borderRadius: isSmall ? '11px' : '13px',
      transition: (theme: Theme) =>
        theme.transitions.create(['background-color'], {
          duration: 500,
        }),
    },
    '& .Mui-checked ~ .MuiSwitch-track': {
      borderColor: getTrackBorderColor(color),
    },
  };

  const labelStyle = {
    '& .MuiFormControlLabel-label': getLabelStyle(labelPlacement, size),
    marginLeft: labelPlacement === 'start' ? 0 : undefined,
  };

  const styledSwitch = (
    <MuiSwitch
      checked={checked}
      color={color}
      defaultChecked={defaultChecked}
      size={size}
      sx={{ ...switchStyle, ...switchSx }}
      focusVisibleClassName=".Mui-focusVisibles"
    />
  );
  return (
    <FormControlLabel
      control={styledSwitch}
      disabled={disabled}
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      label={label ?? <span />}
      labelPlacement={labelPlacement}
      onChange={onChange}
      sx={{ ...labelStyle, ...labelSx }}
      value={value}
    />
  );
};
