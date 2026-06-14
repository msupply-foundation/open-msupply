import type { ReactNode } from 'react';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link, useRouterState } from '@tanstack/react-router';

export const DRAWER_WIDTH = 220;

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

// Grows as feature verticals land.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <DashboardOutlinedIcon />, exact: true },
  { to: '/stock', label: 'Stock', icon: <Inventory2OutlinedIcon /> },
  { to: '/stocktake', label: 'Stocktake', icon: <FactCheckOutlinedIcon /> },
];

interface NavDrawerProps {
  /** Controls the temporary (mobile) drawer; ignored by the permanent one. */
  mobileOpen: boolean;
  onClose: () => void;
}

const paperSx = { width: DRAWER_WIDTH, boxSizing: 'border-box' } as const;

export function NavDrawer({ mobileOpen, onClose }: NavDrawerProps) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  const content = (
    <>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
          open mSupply
        </Typography>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {NAV_ITEMS.map(item => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={isActive(item)}
              onClick={onClose} // closes the overlay on mobile; no-op for permanent
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </>
  );

  return (
    <>
      {/* Mobile: temporary overlay, toggled by the AppBar hamburger. */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': paperSx,
        }}
      >
        {content}
      </Drawer>

      {/* Desktop: permanent sidebar that reserves layout width. */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': paperSx,
        }}
      >
        {content}
      </Drawer>
    </>
  );
}
