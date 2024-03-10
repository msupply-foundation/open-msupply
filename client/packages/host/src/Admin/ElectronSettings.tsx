import React, { useEffect, useState } from 'react';

import {
  AlertIcon,
  BarcodeScanner,
  Box,
  LoadingButton,
  LocaleKey,
  Switch,
  Typography,
  useBarcodeScannerContext,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Setting } from './Setting';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const omsBarcode = require('./omsupply-barcode.gif');
const SCAN_TIMEOUT_IN_MS = 50000;

const Scanner = ({ scanner }: { scanner: BarcodeScanner | null }) => {
  const t = useTranslation();

  if (!scanner)
    return (
      <Box display="flex">
        <AlertIcon color="error" />
        <Typography
          component="div"
          sx={{
            alignItems: 'center',
            display: 'inline-flex',
            fontSize: '14px',
            paddingLeft: 1,
          }}
        >
          {t('messages.no-scanners-found')}
        </Typography>
      </Box>
    );

  const status: { color: 'green' | 'error'; message: LocaleKey } =
    scanner.connected
      ? { color: 'green', message: 'messages.scanner-connected' }
      : { color: 'error', message: 'messages.scanner-disconnected' };

  return (
    <Box sx={{ paddingLeft: 10 }}>
      <Box>
        <Typography style={{ fontWeight: 'bold' }}>
          {scanner.manufacturer}
        </Typography>
        <Typography>{scanner.product}</Typography>
        <Typography>
          {t('label.barcode-scanner-id', {
            vid: scanner.vendorId,
            pid: scanner.productId,
          })}
        </Typography>
        <Typography color={status.color}>{t(status.message)}</Typography>
      </Box>
    </Box>
  );
};

export const ElectronSettings = () => {
  const { electronNativeAPI } = window;
  const t = useTranslation();
  const [scanner, setScanner] = useState<BarcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { error, success } = useNotification();
  const {
    setScanner: setBarcodeScanner,
    scannerType,
    setScannerType,
  } = useBarcodeScannerContext();

  const startDeviceScan = async () => {
    setIsScanning(true);

    const timeoutPromise = new Promise<undefined>((_, reject) =>
      setTimeout(reject, SCAN_TIMEOUT_IN_MS, 'Scan timed out')
    );

    const getDevicePromise = () =>
      new Promise<BarcodeScanner | undefined>(async resolve => {
        const { startDeviceScan } = electronNativeAPI;
        await startDeviceScan();

        electronNativeAPI.onDeviceMatched((_event, scanner) =>
          resolve(scanner)
        );
      });

    try {
      const device = await Promise.race([timeoutPromise, getDevicePromise()]);
      if (!device) return;
      setScanner(device);
      setBarcodeScanner(device);
      success(t('messages.scanner-found'))();
    } catch (e) {
      error(t('error.unable-to-detect-scanner'))();
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    electronNativeAPI?.linkedBarcodeScannerDevice().then(setScanner);
  }, [electronNativeAPI, scannerType]);

  if (!electronNativeAPI) return null;

  return (
    <>
      <Typography variant="h5" color="primary" style={{ paddingBottom: 25 }}>
        {t('heading.barcode-scanners')}
      </Typography>

      <Setting
        title={'Scanner Type'}
        component={
          <Box display="flex" justifyContent="flex-end" alignItems="center">
            <Switch
              label={'USB Serial'}
              checked={scannerType === 'usb_keyboard'}
              onChange={(_event, checked) => {
                setScannerType(checked ? 'usb_keyboard' : 'usb_serial');
              }}
              size="small"
            />
            <Box paddingLeft={2} paddingRight={2}>
              {'USB Keyboard'}
            </Box>
          </Box>
        }
      />
      {scannerType === 'usb_serial' && (
        <>
          <Setting
            title={t('label.current')}
            component={<Scanner scanner={scanner} />}
          />
          <Setting
            title=""
            component={
              <Box>
                {isScanning && (
                  <Box style={{ textAlign: 'center' }} padding={2}>
                    <img src={omsBarcode} alt="omSupply Barcode" />
                    <Typography>{t('messages.detect-scanner')}</Typography>
                  </Box>
                )}
                <Box display="flex" justifyContent="flex-end">
                  <LoadingButton
                    onClick={startDeviceScan}
                    isLoading={isScanning}
                  >
                    {t('label.detect-scanners')}
                  </LoadingButton>
                </Box>
              </Box>
            }
          />
        </>
      )}
    </>
  );
};
