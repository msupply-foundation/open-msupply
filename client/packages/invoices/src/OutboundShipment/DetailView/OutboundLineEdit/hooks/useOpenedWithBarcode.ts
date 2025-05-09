import { useEffect } from 'react';
import { getPackQuantityCellId } from '../../../../utils';
import { ScannedBarcode } from '../../../../types';
import { useOutbound } from '../../../api';

export const useOpenedWithBarcode = (barcode: ScannedBarcode | null) => {
  const { mutateAsync: insertBarcode } = useOutbound.utils.barcodeInsert();

  useFocusNumberOfPacksInput(barcode?.batch);

  const saveBarcode = async (itemId: string, packSize?: number) => {
    // ID means barcode has already been saved
    if (!barcode || barcode.id) return;

    return insertBarcode({
      input: {
        gtin: barcode.gtin,
        itemId,
        packSize,
      },
    });
  };

  return { saveBarcode };
};

const useFocusNumberOfPacksInput = (batch: string | undefined) => {
  useEffect(() => {
    setTimeout(() => {
      if (!batch) return;
      const input = document.getElementById(getPackQuantityCellId(batch));
      if (input) {
        input.focus();
      }
    }, 500);
  }, [batch]);
};
