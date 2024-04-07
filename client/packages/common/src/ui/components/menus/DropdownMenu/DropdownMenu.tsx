import React, { FC, PropsWithChildren, useState } from 'react';
import {
  MenuItem,
  MenuItemProps,
  FormControl,
  Select,
  InputLabel,
  outlinedInputClasses,
  Box,
  SvgIconProps,
  ListItemText,
  styled,
  SxProps,
} from '@mui/material';

import { ChevronDownIcon } from '@common/icons';

interface DropdownMenuItemProps extends MenuItemProps {
  IconComponent?: React.JSXElementConstructor<SvgIconProps>;
  inset?: boolean;
  color?: 'primary' | 'secondary';
}

export const DropdownMenuItem: FC<DropdownMenuItemProps> = ({
  IconComponent,
  color,
  children,
  ...props
}) => {
  return (
    <MenuItem sx={{ fontSize: '10' }} {...props}>
      {IconComponent ? (
        <Box mr={1}>
          <IconComponent fontSize="inherit" color={color} />
        </Box>
      ) : null}
      <ListItemText
        inset={props.inset}
        primaryTypographyProps={{ color, sx: { fontSize: 'inherit' } }}
        sx={{
          '&.MuiListItemText-inset': { paddingLeft: '22px' },
        }}
      >
        {children}
      </ListItemText>
    </MenuItem>
  );
};

const StyledSelect = styled(Select)(({ theme }) => ({
  borderRadius: '8px',
  width: 160,
  backgroundColor: 'white',
  '& .MuiSelect-icon': {
    // If left is not explicitly defined, sometimes the icon floats to the left
    left: 'calc(100% - 30px)',
    color: theme.palette.primary.main,
  },

  [`& .${outlinedInputClasses.notchedOutline}`]: {
    borderColor: theme.palette.border,
  },
  [`&:hover .${outlinedInputClasses.notchedOutline}`]: {
    borderColor: theme.palette.border,
  },

  [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]:
    {
      borderColor: theme.palette.gray.dark,
    },
}));

interface DropdownMenuProps {
  label: string;
  disabled?: boolean;
  sx?: SxProps;
  selectSx?: SxProps;
}

// Styled doesn't like `sx` prop being passed to it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DropdownMenu: FC<PropsWithChildren<DropdownMenuProps>> = ({
  label,
  children,
  disabled = false,
  sx,
  selectSx,
}) => {
  const [open, setOpen] = useState(false);
  const onClick = disabled ? undefined : () => setOpen(curr => !curr);
  return (
    <FormControl size="small" sx={sx}>
      <InputLabel
        shrink={false}
        sx={{ color: 'gray.main', '&.Mui-focused': { color: 'gray.main' } }}
        id={`action-drop-down-label-${label}`}
      >
        {label}
      </InputLabel>
      <StyledSelect
        disabled={disabled}
        value=""
        size="small"
        open={open}
        labelId={`action-drop-down-label-${label}`}
        variant="outlined"
        IconComponent={ChevronDownIcon}
        onClick={onClick}
        sx={selectSx}
      >
        {children}
      </StyledSelect>
    </FormControl>
  );
};
