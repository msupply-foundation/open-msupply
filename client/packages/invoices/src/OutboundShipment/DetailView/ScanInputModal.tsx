/* eslint-disable no-console */
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
      console.log('📢 OutboundShipment ScanInputModal: Scan received:', result);

      if (!result.content) {
        console.log('📢 OutboundShipment: No content in scan result');
        return;
      }

      const { content, gtin, batch, expiryDate } = result;
      const value = gtin ?? content;

      console.log('📢 OutboundShipment: Looking up barcode:', value);

      try {
        const barcode = await getBarcode(value);
        console.log('📢 OutboundShipment: Barcode lookup result:', barcode);

        // Barcode exists
        if (barcode?.__typename === 'BarcodeNode') {
          console.log(
            '📢 OutboundShipment: Found existing barcode, calling onAddItem'
          );
          onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
        } else {
          console.log('📢 OutboundShipment: No matching item found');
          warning('No matching item found for scanned barcode')();

          // Still add with GTIN so user can create new barcode association
          onAddItem({
            gtin: value,
            batch,
            expiryDate: expiryDate ?? undefined,
          });
        }
      } catch (error) {
        console.error(
          '📢 OutboundShipment: Error during barcode lookup:',
          error
        );
        warning('Error looking up barcode')();
      }
    },
    [getBarcode, onAddItem, warning]
  );

  // Register the scan handler - this component doesn't render anything
  useBarcodeScannerContext(handleScan);

  return null;
};
