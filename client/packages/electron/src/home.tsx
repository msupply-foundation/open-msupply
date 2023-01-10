import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/variable.css';
import {
  AppThemeProvider,
  IntlProvider,
  RandomLoader,
  ServerDiscovery,
} from '@openmsupply-client/common';
import { Viewport } from '@openmsupply-client/host/src/components';

const ClientHomeScreen = () => (
  <React.Suspense fallback={<div />}>
    <IntlProvider isElectron={true}>
      <React.Suspense fallback={<RandomLoader />}>
        <AppThemeProvider>
          <Viewport>
            <ServerDiscovery />
          </Viewport>
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
