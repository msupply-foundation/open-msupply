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

export function NavDrawer() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap fontWeight={700}>
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
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
