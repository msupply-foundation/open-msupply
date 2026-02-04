import React, { useEffect, useRef } from 'react';
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

interface AddFromScannerButtonProps {
  handleScanResult: (result: ScanResult) => Promise<void>;
  disabled: boolean;
}

export const AddFromScannerButton = ({
  handleScanResult,
  disabled,
}: AddFromScannerButtonProps) => {
  const t = useTranslation();
  const {
    isConnected,
    isEnabled,
    isListening,
    scan,
    stopScan,
    startListening,
    supportsContinuousScanning,
  } = useBarcodeScannerContext();
  const { error } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = async () => {
    buttonRef.current?.blur();
    if (isListening) {
      stopScan();
    } else {
      if (supportsContinuousScanning && !isListening) {
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
    if (!isListening && !disabled && supportsContinuousScanning) {
      startListening(async (result, err) => {
        if (err) {
          error(t('messages.scanning-error', { error: err }))();
          return;
        }

        await handleScanResult(result);
      });
    }
    // only need to respond to changes in supportsContinuousScanning
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportsContinuousScanning]);

  const label = isListening
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
