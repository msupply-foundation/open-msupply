import { useState, type ReactNode } from 'react';
import { MenuIcon } from 'lucide-react';
import { useTokenRefresh } from '@/app/useTokenRefresh';
import { useIdleTimeout } from '@/app/useIdleTimeout';
import { useBranding } from '@/features/branding/useBranding';
import { NavDrawer } from '@/app/NavDrawer';
import { SyncModal } from '@/features/sync/SyncModal';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/intl';

export function AppLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  // Keep the bearer token fresh while the authenticated shell is mounted, and
  // log out after 15 minutes of inactivity.
  useTokenRefresh();
  useIdleTimeout();
  // Fetch + apply server-distributed org branding (cheap; hash-gated server-side).
  useBranding();

  return (
    <div className="flex h-screen">
      <NavDrawer
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onOpenSync={() => setSyncOpen(true)}
      />
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />

      {/* No top bar — mobile gets a floating button to open the drawer. */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setMobileNavOpen(true)}
        aria-label={t('label.open-navigation')}
        className="fixed start-2 top-2 z-50 bg-background shadow-md md:hidden"
      >
        <MenuIcon />
      </Button>

      <main className="min-w-0 flex-1 overflow-auto p-6 pt-16 md:pt-6">
        {children}
      </main>
    </div>
  );
}
