import React, { useEffect, useState } from 'react';

import {
  Box,
  Typography,
  AlertIcon,
  CheckIcon,
  ButtonWithIcon,
  useBarcodeScannerContext,
  AvailableScannerType,
  Switch,
  LoadingButton,
  useNotification,
  LocaleKey,
  BarcodeScanner,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { Setting } from './Setting';
import { SettingsSubHeading } from './SettingsSection';
import { AppRoute } from '@openmsupply-client/config';
import { ScanIcon } from '@common/icons';
import { useNavigate } from 'react-router';

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

const getScannerLabel = (
  scanner: AvailableScannerType,
  t: ReturnType<typeof useTranslation>
): string => {
  switch (scanner) {
    case AvailableScannerType.Mock:
      return 'Mock Scanner';
    case AvailableScannerType.Honeywell:
      return t('label.barcode-scanner-honeywell');
    case AvailableScannerType.Camera:
      return t('label.barcode-scanner-camera');
    case AvailableScannerType.ElectronUSB:
      return t('label.barcode-scanner-electron-usb');
    default:
      return scanner;
  }
};

export const BarcodeScannerSettings = () => {
  const { electronNativeAPI } = window;
  const t = useTranslation();
  const navigate = useNavigate();
  const [electronScanner, setElectronScanner] = useState<BarcodeScanner | null>(
    null
  );
  const [isScanning, setIsScanning] = useState(false);
  const { error, success } = useNotification();
  const {
    isConnected,
    isEnabled,
    availableScanners,
    scannerType,
    setScannerType,
    setScanner: setBarcodeScanner,
    mockScannerEnabled,
    setMockScannerEnabled,
  } = useBarcodeScannerContext();

  const startDeviceScan = async () => {
    setIsScanning(true);

    const timeoutPromise = new Promise<undefined>((_, reject) =>
      setTimeout(reject, SCAN_TIMEOUT_IN_MS, 'Scan timed out')
    );

    const getDevicePromise = () =>
      new Promise<BarcodeScanner | undefined>(async resolve => {
        if (!electronNativeAPI) {
          resolve(undefined);
          return;
        }

        await electronNativeAPI.startDeviceScan();

        electronNativeAPI.onDeviceMatched((_event, scanner) =>
          resolve(scanner)
        );
      });

    try {
      const device = await Promise.race([timeoutPromise, getDevicePromise()]);
      if (!device) return;
      setElectronScanner(device);
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
    electronNativeAPI?.linkedBarcodeScannerDevice().then(setElectronScanner);
  }, [electronNativeAPI, scannerType]);

  return (
    <>
      <SettingsSubHeading title={t('settings.barcode-scanner')} />

      <Setting
        component={
          <Box display="flex" alignItems="center" gap={1}>
            {isEnabled ? (
              <>
                <CheckIcon color="success" />
                <Typography>{t('label.barcode-scanner-enabled')}</Typography>
              </>
            ) : (
              <>
                <AlertIcon color="error" />
                <Typography>{t('label.barcode-scanner-disabled')}</Typography>
              </>
            )}
          </Box>
        }
        title={t('label.barcode-scanner-status')}
      />

      <Setting
        component={
          <Box display="flex" alignItems="center" gap={1}>
            {isConnected ? (
              <>
                <CheckIcon color="success" />
                <Typography>{t('label.barcode-scanner-connected')}</Typography>
              </>
            ) : (
              <>
                <AlertIcon color="warning" />
                <Typography>
                  {t('label.barcode-scanner-not-connected')}
                </Typography>
              </>
            )}
          </Box>
        }
        title={t('label.barcode-scanner-connection-status')}
      />

      <Setting
        component={
          <Box>
            {availableScanners.map(scanner => (
              <Box
                key={scanner}
                display="flex"
                alignItems="center"
                gap={1}
                sx={{ mb: 0.5 }}
              >
                <CheckIcon color="success" />
                <Typography>{getScannerLabel(scanner, t)}</Typography>
              </Box>
            ))}
            {availableScanners.length === 0 && (
              <Box display="flex" alignItems="center" gap={1}>
                <AlertIcon color="error" />
                <Typography>{t('messages.no-scanners-available')}</Typography>
              </Box>
            )}
          </Box>
        }
        title={t('label.barcode-scanner-available')}
      />

      {/* Mock Scanner Toggle */}
      <Setting
        title="Mock Scanner"
        component={
          <Box display="flex" justifyContent="flex-end" alignItems="center">
            <Switch
              checked={mockScannerEnabled}
              onChange={(_event, checked) => {
                setMockScannerEnabled(checked);
              }}
              size="small"
            />
            <Box paddingLeft={2}>
              {mockScannerEnabled ? 'Enabled' : 'Disabled'}
            </Box>
          </Box>
        }
      />

      {/* USB Scanner Type Selection (Electron only) */}
      {availableScanners.includes(AvailableScannerType.ElectronUSB) &&
        electronNativeAPI && (
          <>
            <Setting
              title={t('settings.scanner-type')}
              component={
                <Box
                  display="flex"
                  justifyContent="flex-end"
                  alignItems="center"
                >
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
                  component={<Scanner scanner={electronScanner} />}
                />
                <Setting
                  title=""
                  component={
                    <Box>
                      {isScanning && (
                        <Box style={{ textAlign: 'center' }} padding={2}>
                          <img src={omsBarcode} alt="omSupply Barcode" />
                          <Typography>
                            {t('messages.detect-scanner')}
                          </Typography>
                        </Box>
                      )}
                      <Box display="flex" justifyContent="flex-end">
                        <LoadingButton
                          onClick={startDeviceScan}
                          isLoading={isScanning}
                          label={t('label.detect-scanners')}
                        />
                      </Box>
                    </Box>
                  }
                />
              </>
            )}
          </>
        )}
      <Setting
        component={
          <Box display="flex" justifyContent="flex-end">
            <ButtonWithIcon
              Icon={<ScanIcon />}
              label={t('label.barcode-scanner-test')}
              onClick={() =>
                navigate(
                  RouteBuilder.create(AppRoute.Settings)
                    .addPart('barcode-scanner-test')
                    .build()
                )
              }
            />
          </Box>
        }
        title={''}
      />
    </>
  );
};
