import { useEffect } from 'react';
import { getStockOutQuantityCellId } from '../../../../utils';
import { ScannedBarcode } from '../../../../types';
import { useOutbound } from '../../../api';
import { useAllocationContext } from '../../../../StockOut';

export const useOpenedWithBarcode = (barcode: ScannedBarcode | null) => {
  const { mutateAsync: insertBarcode } = useOutbound.utils.barcodeInsert();

  const { itemId, draftLines } = useAllocationContext(state => ({
    draftLines: state.draftLines,
    itemId: state.item?.id,
  }));

  useFocusNumberOfPacksInput(barcode?.batch, itemId ?? null);

  const saveBarcode = async (itemId: string) => {
    // ID means barcode has already been saved
    if (!barcode || barcode.id) return;

    // Find pack size of first allocated line to associate with barcode
    // Usually, scanned barcode would match only one batch, so only one line would
    // match here - but if many matched, we will just take the first
    const packSize = draftLines.find(line => line.numberOfPacks > 0)?.packSize;

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

const useFocusNumberOfPacksInput = (
  batch: string | undefined,
  itemId: string | null
) => {
  useEffect(() => {
    if (!batch || !itemId) return;
    setTimeout(() => {
      const input = document.getElementById(getStockOutQuantityCellId(batch));
      if (input) {
        input.focus();
      }
    }, 500);
  }, [batch, itemId]);
};
