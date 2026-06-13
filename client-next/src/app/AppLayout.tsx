import { useState, type ReactNode } from 'react';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { useSession } from '@/app/session';
import { useTokenRefresh } from '@/app/useTokenRefresh';
import { NavDrawer } from '@/app/NavDrawer';

export function AppLayout({ children }: { children: ReactNode }) {
  const store = useSession(s => s.store);
  const clear = useSession(s => s.clear);
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Keep the bearer token fresh while the authenticated shell is mounted.
  useTokenRefresh();

  const onLogout = () => {
    clear();
    navigate({ to: '/login' });
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <NavDrawer
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <Box
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar variant="dense">
            <Tooltip title="Menu">
              <IconButton
                edge="start"
                size="small"
                onClick={() => setMobileNavOpen(true)}
                sx={{ display: { md: 'none' }, mr: 1 }}
                aria-label="Open navigation"
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ flexGrow: 1 }} />
            {store ? (
              <Typography variant="body2" sx={{ mr: 2 }}>
                {store.name}
              </Typography>
            ) : null}
            <Tooltip title="Sign out">
              <IconButton onClick={onLogout} size="small">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
