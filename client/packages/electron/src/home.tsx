import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import {
  AppThemeProvider,
  HashRouter,
  initialiseI18n,
  IntlProvider,
  QueryClient,
  QueryClientProvider,
  RandomLoader,
  Route,
  Routes,
  ServerDiscovery,
} from '@openmsupply-client/common';
import { Viewport } from '@openmsupply-client/host/src/components';
import { ErrorPage } from './error';

initialiseI18n({ isElectron: true });

const ClientHomeScreen = () => (
  <React.Suspense fallback={<div />}>
    <IntlProvider>
      <React.Suspense fallback={<RandomLoader />}>
        <AppThemeProvider>
          <QueryClientProvider client={new QueryClient()}>
            <HashRouter>
              <Viewport>
                <Routes>
                  <Route path="/error" element={<ErrorPage />} />
                  <Route path="/" element={<ServerDiscovery />} />
                </Routes>
              </Viewport>
            </HashRouter>
          </QueryClientProvider>
        </AppThemeProvider>
      </React.Suspense>
    </IntlProvider>
  </React.Suspense>
);

const container = document.getElementById('root');
/* eslint-disable @typescript-eslint/no-non-null-assertion */
const root = createRoot(container!);
root.render(<ClientHomeScreen />);

export { ServerDiscovery };
