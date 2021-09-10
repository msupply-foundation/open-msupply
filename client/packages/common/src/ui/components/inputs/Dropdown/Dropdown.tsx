import React, { FC } from 'react';
import {
  MenuItem,
  MenuItemProps,
  FormControl,
  Select,
  InputLabel,
  outlinedInputClasses,
} from '@material-ui/core';
import { styled } from '@material-ui/system';

import { ChevronDown } from '../../../icons';

export const DropdownItem: FC<MenuItemProps> = props => {
  return <MenuItem {...props} />;
};

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: '8px',
  width: 160,
  backgroundColor: 'white',
  '& .MuiSelect-icon': {
    // If left is not explicitly defined, sometimes the icon floats to the left
    left: 'calc(100% - 30px)',
    color: theme.palette['primary']['500'],
  },

  [`& .${outlinedInputClasses.notchedOutline}`]: {
    borderColor: '#e4e4eb',
  },
  [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
    borderColor: '#e4e4eb',
  },

  [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]:
    {
      borderColor: theme.palette['darkGrey'],
    },
}));

interface DropdownProps {
  label: string;
}

// Styled doesn't like `sx` prop being passed to it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Dropdown: FC<DropdownProps> = ({ label, children }) => {
  return (
    <FormControl size="small">
      <InputLabel
        shrink={false}
        sx={{ color: '#8f90a6', '&.Mui-focused': { color: '#8f90a6' } }}
        id={`action-drop-down-label-${label}`}
        aria-label="Select an action to perform on selected rows"
      >
        {label}
      </InputLabel>
      <StyledSelect
        value=""
        size="small"
        labelId={`action-drop-down-label-${label}`}
        variant="outlined"
        IconComponent={ChevronDown}
      >
        {children}
      </StyledSelect>
    </FormControl>
  );
};
