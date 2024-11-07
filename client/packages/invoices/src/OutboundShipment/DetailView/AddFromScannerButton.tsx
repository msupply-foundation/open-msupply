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
import { isOutboundDisabled } from '../../utils';
import { Draft } from '../..';

export const AddFromScannerButtonComponent = ({
  onAddItem,
}: {
  onAddItem: (draft?: Draft) => void;
}) => {
  const t = useTranslation();
  const { data: outbound } = useOutbound.document.get();
  const isDisabled = !!outbound && isOutboundDisabled(outbound);
  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();
  const { isConnected, isEnabled, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error, warning } = useNotification();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin, batch } = result;
      const value = gtin ?? content;
      const barcode = await getBarcode(value);

      if (barcode?.__typename === 'BarcodeNode') {
        const id = barcode?.itemId;

        if (!!id) {
          onAddItem({
            item: { id },
            barcode: { ...barcode, batch },
          });
          return;
        }
      }

      warning(t('error.no-matching-item'))();

      onAddItem({ barcode: { gtin: value, batch } });
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

  const label = t(isScanning ? 'button.stop' : 'button.scan');
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
          disabled={isDisabled || !isConnected}
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
