import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Settings } from '../Admin/Settings';
import { BarcodeScannerTest } from '../Admin/BarcodeScannerTest';

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
    return <BarcodeScannerTest />;
  }

  if (gotoSettings) {
    return <Settings />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
