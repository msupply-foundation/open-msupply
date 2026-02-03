import React, { useEffect, useRef, useCallback } from 'react';
import {
  useTranslation,
  useBarcodeScannerContext,
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
  const {
    isConnected,
    isEnabled,
    isScanning,
    isListening,
    scan,
    stopScan,
    startListening,
    supportsContinuousScanning,
  } = useBarcodeScannerContext();
  const { error, warning } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleScanResult = useCallback(
    async (result: ScanResult) => {
      if (!!result.content) {
        const { content, gtin, batch, expiryDate } = result;
        const value = gtin ?? content;
        const barcode = await getBarcode(value);

        // Barcode exists
        if (barcode?.__typename === 'BarcodeNode') {
          onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
        } else {
          warning(t('error.no-matching-item'))();

          onAddItem({
            gtin: value,
            batch,
            expiryDate: expiryDate ?? undefined,
          });
        }
      }
    },
    [getBarcode, onAddItem, warning, t]
  );

  const handleClick = async () => {
    buttonRef.current?.blur();
    if (isScanning || isListening) {
      stopScan();
    } else {
      if (supportsContinuousScanning && !isListening) {
        console.log('Starting continuous scan listening');
        // Auto-start continuous scanning is available, start listening and wait for a scan
        startListening(async (result, err) => {
          if (err) {
            error(t('messages.scanning-error', { error: err }))();
            return;
          }
          await handleScanResult(result);
        });
      } else {
        // One-off scan
        try {
          const result = await scan();
          handleScanResult(result);
        } catch (e) {
          error(t('error.unable-to-start-scanning', { error: e }))();
        }
      }
    }
  };

  // stop scanning when the component unloads
  useEffect(() => {
    return () => {
      stopScan();
    };
  }, []);

  // Auto-start scanning for continuous scanning when component loads
  useEffect(() => {
    console.log(
      'useEffect supportsContinuousScanning',
      supportsContinuousScanning
    );
    // if (!isListening && supportsContinuousScanning) {
    //   console.log('Starting continuous scan listening');
    //   startListening(async (result, err) => {
    //     if (err) {
    //       error(t('messages.scanning-error', { error: err }))();
    //       return;
    //     }

    //     await handleScanResult(result);
    //   });
    // }
    // only need to respond to changes in supportsContinuousScanning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsContinuousScanning]);

  const label = isScanning
    ? `${t('button.scanning')}  🟢`
    : isListening
      ? `${t('button.listening-for-scans')}  🟢`
      : `${t('button.scan')}`;
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
    [isListening]
  );

  if (!isEnabled) return null;

  return (
    <Tooltip title={isConnected ? '' : t('error.scanner-not-connected')}>
      <Box>
        <ButtonWithIcon
          ref={buttonRef}
          disabled={disabled || !isConnected}
          onClick={handleClick}
          Icon={<ScanIcon />}
          label={label}
        />
      </Box>
    </Tooltip>
  );
};

export const AddFromScannerButton = React.memo(AddFromScannerButtonComponent);
