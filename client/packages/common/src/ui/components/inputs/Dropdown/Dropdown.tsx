import React, { FC } from 'react';
import Select, { SelectProps } from '@material-ui/core/Select';
import MenuItem, { MenuItemProps } from '@material-ui/core/MenuItem';
import { styled } from '@material-ui/system';

export const DropdownItem: FC<MenuItemProps> = props => {
  return <MenuItem {...props} />;
};

const StyledSelect = styled(Select)({});

// Styled doesn't like `sx` prop being passed to it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const Dropdown: FC<SelectProps> = ({ sx, ...props }) => {
  return <StyledSelect {...props} />;
};
