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
import { DraftItem, useOutbound } from '../api';
import { isOutboundDisabled } from '../../utils';

export const AddFromScannerButtonComponent = ({
  onAddItem,
}: {
  onAddItem: (item?: DraftItem) => void;
}) => {
  const t = useTranslation('distribution');
  const { data: outbound } = useOutbound.document.get();
  const isDisabled = !!outbound && isOutboundDisabled(outbound);
  const { mutateAsync: getBarcodes } = useOutbound.utils.barcodes();
  const { hasBarcodeScanner, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { error, warning } = useNotification();

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin, batch } = result;
      const value = gtin ?? content;
      const barcodes = await getBarcodes(value);

      if (barcodes.totalCount > 0) {
        const barcode = barcodes.nodes[0];
        const id = barcode?.itemId;

        if (!!id) {
          onAddItem({
            item: { id },
            barcode: { ...barcode, batch },
          } as DraftItem);
          return;
        }
      }

      warning(t('error.no-matching-item'))();

      onAddItem({ barcode: { value, batch } } as DraftItem);
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
