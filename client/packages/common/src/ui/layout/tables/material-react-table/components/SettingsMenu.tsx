import React from 'react';
import {
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { IconButton, useConfirmationModal } from '@common/components';
import { useTranslation } from '@common/intl';
import { MRT_DensityState, MRT_TableInstance } from 'material-react-table';
import { RefreshIcon, SettingsIcon } from '@common/icons';
import {
  useColumnDensity,
  useColumnOrder,
  useColumnPinning,
  useColumnSizing,
  useColumnVisibility,
} from '../tableState';
// MRT uses these icons - match the column menu items/table default icons until icon library + table icons are updated
import PushPinIcon from '@mui/icons-material/PushPin';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DensityLargeIcon from '@mui/icons-material/DensityLarge';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export const SettingsMenu = ({
  table,
  density,
  columnSizing,
  columnVisibility,
  columnPinning,
  columnOrder,
  resetTableState,
}: {
  table: MRT_TableInstance<any>;
  density: ReturnType<typeof useColumnDensity>;
  columnSizing: ReturnType<typeof useColumnSizing>;
  columnVisibility: ReturnType<typeof useColumnVisibility>;
  columnPinning: ReturnType<typeof useColumnPinning>;
  columnOrder: ReturnType<typeof useColumnOrder>;
  resetTableState: () => void;
}) => {
  const t = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = !!anchorEl;

  const hasSavedState =
    density.hasSavedState ||
    columnSizing.hasSavedState ||
    columnPinning.hasSavedState ||
    columnVisibility.hasSavedState ||
    columnOrder.hasSavedState;

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.reset-table-defaults'),
    onConfirm: resetTableState,
  });

  const densities: MRT_DensityState[] = ['compact', 'spacious', 'comfortable'];
  const currentIndex = densities.indexOf(density.state);
  const nextIndex = (currentIndex + 1) % densities.length;
  const nextDensity = densities[nextIndex] ?? 'comfortable';

  const densityIcon = () => {
    if (density.state === 'compact') {
      return <DensitySmallIcon fontSize="small" />;
    } else if (density.state === 'spacious') {
      return <DensityLargeIcon fontSize="small" />;
    } else {
      return <DensityMediumIcon fontSize="small" />;
    }
  };

  return (
    <>
      {/* Toolbar button */}
      <IconButton
        icon={<SettingsIcon />}
        onClick={e => setAnchorEl(e.currentTarget)}
        label={t('settings')}
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
        <>
          <MenuItem
            key={'Reset column order'}
            disabled={!columnOrder.hasSavedState}
            onClick={() => {
              table.resetColumnOrder();
              columnOrder.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <SwapHorizIcon />
            </ListItemIcon>
            <ListItemText>{'Reset column order'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Reset column visibility'}
            disabled={!columnVisibility.hasSavedState}
            onClick={() => {
              table.resetColumnVisibility();
              columnVisibility.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <ViewColumnIcon />
            </ListItemIcon>
            <ListItemText>{'Reset column visibility'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Reset column width'}
            disabled={!columnSizing.hasSavedState}
            onClick={() => {
              table.resetColumnSizing();
              columnSizing.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <RestartAltIcon />
            </ListItemIcon>
            <ListItemText>{'Reset column width'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Unpin all columns'}
            disabled={!columnPinning.hasSavedState}
            onClick={() => {
              table.resetColumnPinning();
              columnPinning.resetHasSavedState();
              // resets pinning to default, including pinned by default columns
              // unpin all on the columns menu actually unpins all, including pinned by default (cant unpin default columns manually though)
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <PushPinIcon />
            </ListItemIcon>

            <ListItemText>{'Unpin all columns'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Table density'}
            onClick={() => density.update(nextDensity)}
          >
            <ListItemIcon>{densityIcon()}</ListItemIcon>
            <ListItemText>{'Table density'}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            key={'Reset to defaults'}
            disabled={!hasSavedState}
            sx={{ color: 'error.main' }}
            onClick={() => {
              table.resetColumnOrder();
              getConfirmation();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <RefreshIcon />
            </ListItemIcon>
            <ListItemText
              sx={{
                '& .MuiTypography-root': {
                  color: 'error.main',
                },
              }}
            >
              {'Reset to defaults'}
            </ListItemText>
          </MenuItem>
          <Divider />
        </>
      </Menu>
    </>
  );
};
