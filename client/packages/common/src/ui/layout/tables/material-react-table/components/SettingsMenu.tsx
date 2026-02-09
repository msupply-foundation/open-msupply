import React from 'react';
import {
  Divider,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { IconButton, useConfirmationModal } from '@common/components';
import { useTranslation } from '@common/intl';
import {
  MRT_DensityState,
  MRT_TableInstance,
  MRT_ToggleDensePaddingButton,
} from 'material-react-table';
import { RefreshIcon, SettingsIcon } from '@common/icons';
import {
  useColumnDensity,
  useColumnOrder,
  useColumnPinning,
  useColumnSizing,
  useColumnVisibility,
} from '../tableState';

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

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.reset-table-defaults'),
    onConfirm: resetTableState,
  });

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
            onClick={() => {
              table.resetColumnOrder();
              columnOrder.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ViewColumnIcon />
            <ListItemText>{'Reset column order'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Reset column visibility'}
            onClick={() => {
              table.resetColumnVisibility();
              columnVisibility.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ViewColumnIcon />
            <ListItemText>{'Reset column visibility'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Reset column width'}
            onClick={() => {
              table.resetColumnSizing();
              columnSizing.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ViewColumnIcon />
            <ListItemText>{'Reset column width'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Unpin all columns'}
            onClick={() => {
              table.resetColumnPinning();
              columnPinning.resetHasSavedState();
              // resets pinning to default, including pinned by default columns
              // unpin all on the columns menu actually unpins all, including pinned by default (cant unpin default columns manually though)
              setAnchorEl(null);
            }}
          >
            <ViewColumnIcon />
            <ListItemText>{'Unpin all columns'}</ListItemText>
          </MenuItem>
          <MenuItem
            key={'Table density'}
            onClick={() => {
              density.update(prev => {
                const densities: MRT_DensityState[] = [
                  'compact',
                  'spacious',
                  'comfortable',
                ];
                const currentIndex = densities.indexOf(prev);
                const nextIndex = (currentIndex + 1) % densities.length;
                // always default to comfortable on reset, so cycle goes compact > spacious > comfortable > compact etc
                // matches default button behaviour
                return densities[nextIndex] ?? 'comfortable';
              });
              //   setAnchorEl(null);
            }}
          >
            <ViewColumnIcon />
            <ListItemText>{'Table density'}</ListItemText>
          </MenuItem>
          <MRT_ToggleDensePaddingButton table={table} />
          <Divider />
          <MenuItem
            key={'Reset to defaults'}
            onClick={() => {
              table.resetColumnOrder();
              getConfirmation();
              setAnchorEl(null);
            }}
          >
            <RefreshIcon />
            <ListItemText>{'Reset to defaults'}</ListItemText>
          </MenuItem>
          <Divider />
        </>
      </Menu>
    </>
  );
};
