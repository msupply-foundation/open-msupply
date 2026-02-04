import React from 'react';
import {
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  SxProps,
  Theme,
  Typography,
} from '@mui/material';
import {
  CameraIcon,
  CartIcon,
  EyeIcon,
  RefreshIcon,
  SunIcon,
  XCircleIcon,
} from '@common/icons';
import { IconButton } from '@common/components';

export interface SettingsMenuOption {
  label: string;
  Icon?: React.ReactElement;
  onClick: () => void;
  isDisabled?: boolean;
  divider?: boolean;
  // sx?: SxProps<Theme>;
  labelColor?: string;
  iconColor?: string;
}

interface SettingsMenuProps {
  icon: React.ReactElement;
  label: string;
  sx?: SxProps<Theme>;
}

export const SettingsMenu = ({ icon, label }: SettingsMenuProps) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = !!anchorEl;

  const settingsMenuOptions: SettingsMenuOption[] = [
    {
      label: 'Reset column order',
      Icon: <XCircleIcon />,
      onClick: () => {},
    },
    {
      label: 'Reset column visibility',
      Icon: <EyeIcon />,
      onClick: () => {},
    },
    {
      label: 'Reset column width',
      Icon: <SunIcon />,
      onClick: () => {},
    },
    {
      label: 'Unpin all columns',
      Icon: <CameraIcon />,
      onClick: () => {},
    },
    {
      label: 'Table density', // ternary for more/less density?
      Icon: <CartIcon />,
      onClick: () => {},
      divider: true,
    },
    {
      label: 'Reset table state',
      Icon: <RefreshIcon />,
      onClick: () => {},
    },
  ];

  return (
    <>
      {/* Toolbar button */}
      <IconButton
        icon={icon}
        onClick={e => setAnchorEl(e.currentTarget)}
        label={label}
      />
      {/* Menu popover */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {/* Menu header */}
        <MenuItem
          disabled // just for display, not clickable
          sx={{
            '&.Mui-disabled': { opacity: 1 }, // but remove the greyed out look
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
          divider
        >
          <Typography fontWeight="bold">Settings</Typography>
        </MenuItem>

        {/* Menu items */}
        {settingsMenuOptions.map((option, index) => (
          <>
            <MenuItem
              key={option.label}
              disabled={option.isDisabled}
              onClick={() => {
                option.onClick();
                setAnchorEl(null);
              }}
            >
              <ListItemIcon>{option.Icon}</ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
            {option.divider && index < settingsMenuOptions.length - 1 && (
              <Divider />
            )}
          </>
        ))}
      </Menu>
    </>
  );
};
