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
import { ItemRowFragment } from '@openmsupply-client/system';
import { useOutbound } from '../api';
import { isOutboundDisabled } from '../../utils';

export const AddFromScannerButtonComponent = ({
  onAddItem,
}: {
  onAddItem: (item?: ItemRowFragment) => void;
}) => {
  const t = useTranslation('distribution');
  const { data: outbound } = useOutbound.document.get();
  const isDisabled = !!outbound && isOutboundDisabled(outbound);
  const { mutateAsync: getBarcodes } = useOutbound.utils.barcodes();
  const { hasBarcodeScanner, isScanning, startScanning, stopScan } =
    useBarcodeScannerContext();
  const { warning } = useNotification();

  const handleScanResult = async (result: ScanResult) => {
    if (!!result.content) {
      const { content, gtin } = result;
      const barcode = gtin ?? content;
      const barcodes = await getBarcodes(barcode);

      if (barcodes.totalCount === 0) {
        warning(t('error.no-matching-item'))();
        // TODO: save barcode after selection
        onAddItem();
        return;
      }

      onAddItem({ id: barcodes.nodes[0]?.itemId } as ItemRowFragment);
    }
  };

  const handleClick = () => {
    if (isScanning) {
      stopScan();
    } else {
      startScanning(handleScanResult);
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
