import React, { useEffect, useRef } from 'react';
import {
  useTranslation,
  useBarcodeScannerContext,
  CircularProgress,
  ScanIcon,
  ScanResult,
  ButtonWithIcon,
  useNotification,
  useRegisterActions,
  Tooltip,
  Box,
} from '@openmsupply-client/common';
import { useOutbound } from '../api';
import { ScannedBarcode } from '../../types';

export const AddFromScannerButtonComponent = ({
  onAddItem,
  disabled,
}: {
  onAddItem: (scannedBarcode?: ScannedBarcode) => void;
  disabled: boolean;
}) => {
  const t = useTranslation();
  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();
  const { isConnected, isEnabled, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error, warning } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin, batch, expiryDate } = result;
      const value = gtin ?? content;
      const barcode = await getBarcode(value);

      // Barcode exists
      if (barcode?.__typename === 'BarcodeNode') {
        onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
      } else {
        warning(t('error.no-matching-item'))();

        onAddItem({ gtin: value, batch, expiryDate: expiryDate ?? undefined });
      }
    }
  };

  const handleClick = async () => {
    buttonRef.current?.blur();
    if (isScanning) {
      stopScan();
    } else {
      try {
        await startScanning(handleScanResult);
      } catch (e) {
        error(t('error.unable-to-start-scanning', { error: e }))();
      }
    }
  };

  //   stop scanning when the component unloads
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  const label = isScanning ? t('button.stop') : t('button.scan');
  useRegisterActions(
    [
      {
        id: 'action:scan-barcode',
        name: `${label} (Ctrl+s)`,
        shortcut: ['Control+s'],
        keywords: 'drawer, close',
        perform: handleClick,
      },
    ],
    [isScanning]
  );

  if (!isEnabled) return null;

  return (
    <Tooltip title={isConnected ? '' : t('error.scanner-not-connected')}>
      <Box>
        <ButtonWithIcon
          ref={buttonRef}
          disabled={disabled || !isConnected}
          onClick={handleClick}
          Icon={
            isScanning ? (
              <CircularProgress size={20} color="primary" />
            ) : (
              <ScanIcon />
            )
          }
          label={label}
        />
      </Box>
    </Tooltip>
  );
};

export const AddFromScannerButton = React.memo(AddFromScannerButtonComponent);
