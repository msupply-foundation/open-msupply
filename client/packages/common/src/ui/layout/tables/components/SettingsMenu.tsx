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
      <IconButton
        icon={<SettingsIcon />}
        onClick={e => setAnchorEl(e.currentTarget)}
        label={t('settings')}
      />
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
        <>
          <MenuItem
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
            <ListItemText>{t('label.reset-column-order')}</ListItemText>
          </MenuItem>
          <MenuItem
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
            <ListItemText>{t('label.show-all-columns')}</ListItemText>
          </MenuItem>
          <MenuItem
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
            <ListItemText>{t('label.reset-column-sizes')}</ListItemText>
          </MenuItem>
          <MenuItem
            disabled={!columnPinning.hasSavedState}
            onClick={() => {
              table.resetColumnPinning();
              columnPinning.resetHasSavedState();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <PushPinIcon />
            </ListItemIcon>
            <ListItemText>{t('label.reset-pinned-columns')}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => density.update(nextDensity)}>
            <ListItemIcon>{densityIcon()}</ListItemIcon>
            <ListItemText> {t('label.toggle-density')}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            disabled={!hasSavedState}
            onClick={() => {
              table.resetColumnOrder();
              getConfirmation();
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <RefreshIcon color={'error'} />
            </ListItemIcon>
            <ListItemText
              sx={{
                '& .MuiTypography-root': {
                  color: 'error.main',
                },
              }}
            >
              {t('label.reset-table-defaults')}
            </ListItemText>
          </MenuItem>
        </>
      </Menu>
    </>
  );
};
