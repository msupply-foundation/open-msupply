import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/app/router';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { applyCachedBranding } from '@/features/branding/branding';
import '@/index.css'; // Tailwind + design tokens
import '@/intl/i18n'; // initialise i18next before the app renders

// Apply any cached org branding before first paint (no flash of default theme).
applyCachedBranding();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
      <Toaster richColors closeButton position="bottom-left" />
    </QueryClientProvider>
  </StrictMode>,
);
