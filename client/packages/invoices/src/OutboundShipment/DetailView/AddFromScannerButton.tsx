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
 * TO-DO: Move this component to the common package, since it's now generalised
 * and used in several places
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

  const tooltipTitle = !isEnabled
    ? t('error.no-scanner-available')
    : !isConnected
    ? t('error.scanner-not-connected')
    : '';

  return (
    <Tooltip title={tooltipTitle}>
      <Box>
        <ButtonWithIcon
          ref={buttonRef}
          disabled={disabled || !isConnected || !isEnabled}
          onClick={handleClick}
          Icon={<ScanIcon />}
          label={label}
        />
      </Box>
    </Tooltip>
  );
};
