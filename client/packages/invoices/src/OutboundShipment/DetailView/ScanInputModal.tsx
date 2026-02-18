import { useCallback } from 'react';
import {
  useBarcodeScannerContext,
  ScanResult,
  useNotification,
} from '@openmsupply-client/common';
import { useOutbound } from '../api';
import { ScannedBarcode } from '../../types';

interface ScanInputModalProps {
  onAddItem: (scanned?: ScannedBarcode) => void;
}

export const ScanInputModal = ({ onAddItem }: ScanInputModalProps) => {
  const { warning } = useNotification();
  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();

  const handleScan = useCallback(
    async (result: ScanResult) => {
      if (!result.content) return;

      const { content, gtin, batch, expiryDate } = result;
      const value = gtin ?? content;

      try {
        const barcode = await getBarcode(value);

        // Barcode exists
        if (barcode?.__typename === 'BarcodeNode') {
          onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
        } else {
          warning('No matching item found for scanned barcode')();
          onAddItem({
            gtin: value,
            batch,
            expiryDate: expiryDate ?? undefined,
          });
        }
      } catch (error) {
        warning('Error looking up barcode')();
      }
    },
    [getBarcode, onAddItem, warning]
  );

  useBarcodeScannerContext(handleScan);

  return null;
};
