import React, { useEffect } from 'react';
import {
  useTranslation,
  useBarcodeScannerContext,
  CircularProgress,
  ScanIcon,
  ScanResult,
  ButtonWithIcon,
  useNotification,
} from '@openmsupply-client/common';
import { Draft, useOutbound } from '../api';
import { isOutboundDisabled } from '../../utils';

export const AddFromScannerButtonComponent = ({
  onAddItem,
}: {
  onAddItem: (draft?: Draft) => void;
}) => {
  const t = useTranslation('distribution');
  const { data: outbound } = useOutbound.document.get();
  const isDisabled = !!outbound && isOutboundDisabled(outbound);
  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();
  const { hasBarcodeScanner, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error, warning } = useNotification();

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

      onAddItem({ barcode: { value, batch } });
    }
  };

  const handleClick = async () => {
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

  if (!hasBarcodeScanner) return null;

  return (
    <ButtonWithIcon
      disabled={isDisabled}
      onClick={handleClick}
      Icon={
        isScanning ? (
          <CircularProgress size={20} color="primary" />
        ) : (
          <ScanIcon />
        )
      }
      label={t(isScanning ? 'button.stop' : 'button.scan')}
    />
  );
};

export const AddFromScannerButton = React.memo(AddFromScannerButtonComponent);
