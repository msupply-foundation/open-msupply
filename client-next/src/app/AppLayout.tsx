import { useState, type ReactNode } from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import { Box, IconButton } from '@mui/material';
import { useTokenRefresh } from '@/app/useTokenRefresh';
import { useIdleTimeout } from '@/app/useIdleTimeout';
import { NavDrawer } from '@/app/NavDrawer';
import { SyncModal } from '@/features/sync/SyncModal';
import { useTranslation } from '@/intl';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  // Keep the bearer token fresh while the authenticated shell is mounted, and
  // log out after 15 minutes of inactivity.
  useTokenRefresh();
  useIdleTimeout();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <NavDrawer
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onOpenSync={() => setSyncOpen(true)}
      />
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />

      {/* No top bar — mobile gets a floating button to open the drawer. */}
      <IconButton
        onClick={() => setMobileNavOpen(true)}
        aria-label={t('label.open-navigation')}
        sx={{
          display: { md: 'none' },
          position: 'fixed',
          top: 8,
          left: 8,
          zIndex: theme => theme.zIndex.appBar,
          bgcolor: 'background.paper',
          boxShadow: 2,
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <MenuIcon />
      </IconButton>

      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          minWidth: 0,
          p: 3,
          pt: { xs: 7, md: 3 }, // clear the floating menu button on mobile
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
