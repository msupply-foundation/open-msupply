import React, { useEffect, useRef } from 'react';
import {
  useTranslation,
  useBarcodeScannerContext,
  ScanIcon,
  ButtonWithIcon,
  useNotification,
  useRegisterActions,
  Tooltip,
  Box,
} from '@openmsupply-client/common';

interface AddFromScannerButtonProps {
  disabled?: boolean;
  initialListening?: boolean;
  handleClickCheck?: () => boolean;
}

/**
 *
 * `AddFromScannerButton` is a reusable component that provides a button to trigger barcode scanning and handles the scanning logic.
 * It supports both one-off scanning and continuous scanning (if supported by the device).
 * The button's label and state will update based on whether it is currently listening for scans,
 * and it will handle scan results through the provided context.
 * @param disabled - Whether the button should be disabled
 * @param initialListening - Whether to start listening for scans immediately on mount (only applicable if continuous scanning is supported)
 * @param handleClickCheck - Optional function to run before handling click, can be used to prevent scanning based on certain conditions
 * @returns A button component that integrates with the barcode scanner context to handle scanning functionality
 */

export const AddFromScannerButton = ({
  disabled = false,
  initialListening = true,
  handleClickCheck,
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
    handleScanResult,
  } = useBarcodeScannerContext();
  const { error } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = async () => {
    buttonRef.current?.blur();

    if (handleClickCheck && !handleClickCheck()) {
      return;
    }

    if (isListening) {
      stopScan();
    } else {
      if (supportsContinuousScanning && !isListening) {
        // Auto-start continuous scanning is available, start listening and wait for a scan
        startListening();
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

  // Auto-start scanning for continuous scanning when component loads
  useEffect(() => {
    if (
      !isListening &&
      !disabled &&
      initialListening &&
      supportsContinuousScanning
    ) {
      startListening();
    }

    return () => {
      stopScan();
    };
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
