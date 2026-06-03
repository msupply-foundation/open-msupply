import React, { FC, Suspense } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

// Lazy: Settings pulls in `react-qr-code`, the full Admin tree (sync
// settings, server settings, label printer settings, etc.) which were
// otherwise loading eagerly with the host bundle on every page including
// login.
const Settings = React.lazy(() =>
  import('../Admin/Settings').then(m => ({ default: m.Settings }))
);
const BarcodeScannerTest = React.lazy(() =>
  import('../Admin/BarcodeScannerTest').then(m => ({
    default: m.BarcodeScannerTest,
  }))
);

const fullBarcodeScannerTestPath = RouteBuilder.create(AppRoute.Settings)
  .addPart('barcode-scanner-test')
  .build();

const fullSettingsPath = RouteBuilder.create(AppRoute.Settings)
  .addWildCard()
  .build();

export const SettingsRouter: FC = () => {
  const gotoBarcodeScannerTest = useMatch(fullBarcodeScannerTestPath);
  const gotoSettings = useMatch(fullSettingsPath);

  if (gotoBarcodeScannerTest) {
    return (
      <Suspense fallback={null}>
        <BarcodeScannerTest />
      </Suspense>
    );
  }

  if (gotoSettings) {
    return (
      <Suspense fallback={null}>
        <Settings />
      </Suspense>
    );
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
