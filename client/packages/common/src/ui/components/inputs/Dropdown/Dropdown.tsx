import React, { FC, useState } from 'react';
import {
  MenuItem,
  MenuItemProps,
  FormControl,
  Select,
  ListItemText,
  Menu,
} from '@material-ui/core';
import { outlinedInputClasses } from '@material-ui/core/OutlinedInput';
import InputLabel from '@material-ui/core/InputLabel';
import { styled } from '@material-ui/system';
import { ChevronDown } from '../../../icons';

export const DropdownItem: FC<MenuItemProps> = props => {
  return <MenuItem {...props} />;
};

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: '8px',
  minWidth: 160,
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

interface Action {
  label: string;
  callback: () => void;
}
interface ActionDropdownProps {
  actions: Action[];
  label: string;
}

// Styled doesn't like `sx` prop being passed to it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ActionDropdown: FC<ActionDropdownProps> = ({ label, actions }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <FormControl margin="dense" size="small">
      <InputLabel
        shrink={false}
        sx={{ color: '#8f90a6', '&.Mui-focused': { color: '#8f90a6' } }}
        id={`action-drop-down-label-${label}`}
        aria-label="Select an action to perform on selected rows"
      >
        {label}
      </InputLabel>
      <StyledSelect
        open={false}
        value=""
        onOpen={event =>
          setAnchorEl(
            (event as React.KeyboardEvent<HTMLDivElement>).currentTarget
          )
        }
        size="small"
        labelId={`action-drop-down-label-${label}`}
        onClick={handleClick}
        variant="outlined"
        IconComponent={ChevronDown}
      />
      <Menu
        sx={{
          '& .MuiPaper-root': { borderRadius: '8px' },
        }}
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
      >
        {actions.map(({ callback, label }) => (
          <DropdownItem
            key={label}
            onClick={() => {
              callback();
              handleClose();
            }}
          >
            <ListItemText>{label}</ListItemText>
          </DropdownItem>
        ))}
      </Menu>
    </FormControl>
  );
};

export const Dropdown = ActionDropdown;
