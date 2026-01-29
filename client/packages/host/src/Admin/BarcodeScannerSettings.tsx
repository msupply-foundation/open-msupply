import React, { useEffect, useState } from 'react';

import {
  Box,
  Typography,
  AlertIcon,
  CheckIcon,
  Link,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { Setting } from './Setting';
import { SettingsSubHeading } from './SettingsSection';
import { AppRoute } from '@openmsupply-client/config';

interface BarcodeScannerInfo {
  honeywellAvailable: boolean;
  honeywellInfo: string;
}

export const BarcodeScannerSettings = () => {
  const t = useTranslation();
  const [scannerInfo, setScannerInfo] = useState<BarcodeScannerInfo>({
    honeywellAvailable: false,
    honeywellInfo: 'Not available',
  });

  useEffect(() => {
    // Check if Honeywell plugin is available
    const honeywellAvailable = typeof window.plugins?.honeywell !== 'undefined';

    // Get Honeywell object info
    let honeywellInfo = 'Not available';
    if (honeywellAvailable && window.plugins?.honeywell) {
      try {
        honeywellInfo = JSON.stringify(window.plugins.honeywell, null, 2);
      } catch (e) {
        honeywellInfo = 'Available (unable to stringify object)';
      }
    }

    setScannerInfo({
      honeywellAvailable,
      honeywellInfo,
    });
  }, []);

  return (
    <>
      <SettingsSubHeading title={t('settings.barcode-scanner')} />
      <Setting
        component={
          <Box display="flex" alignItems="center" gap={1}>
            {scannerInfo.honeywellAvailable ? (
              <>
                <CheckIcon color="success" />
                <Link
                  to={RouteBuilder.create(AppRoute.Settings)
                    .addPart('barcode-scanner-test')
                    .build()}
                >
                  <Typography>Available</Typography>
                </Link>
              </>
            ) : (
              <>
                <AlertIcon color="error" />
                <Typography>Not Available</Typography>
              </>
            )}
          </Box>
        }
        title="Honeywell Barcode Scanner"
      />
      {scannerInfo.honeywellAvailable && (
        <>
          <Setting
            component={
              <Box sx={{ maxWidth: '100%', overflow: 'auto' }}>
                <Typography
                  component="pre"
                  sx={{
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {scannerInfo.honeywellInfo}
                </Typography>
              </Box>
            }
            title="Honeywell Plugin Information"
          />
        </>
      )}
    </>
  );
};
