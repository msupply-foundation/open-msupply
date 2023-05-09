import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/variable.css';
import {
  AppThemeProvider,
  HashRouter,
  IntlProvider,
  RandomLoader,
  Route,
  Routes,
  ServerDiscovery,
} from '@openmsupply-client/common';
import { Viewport } from '@openmsupply-client/host/src/components';
import { ErrorPage } from './error';

const ClientHomeScreen = () => (
  <React.Suspense fallback={<div />}>
    <IntlProvider isElectron={true}>
      <React.Suspense fallback={<RandomLoader />}>
        <AppThemeProvider>
          <HashRouter>
            <Viewport>
              <Routes>
                <Route path="/error" element={<ErrorPage />} />
                <Route path="/" element={<ServerDiscovery />} />
              </Routes>
            </Viewport>
          </HashRouter>
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
