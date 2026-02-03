import {
  BasicModal,
  DialogButton,
  InputWithLabelRow,
  TextField,
  TextInput,
  Typography,
  TextWithLabelRow,
  useTranslation,
  BasicTextInput,
  NumericTextInput,
  DatePicker,
  Alert,
} from '@openmsupply-client/common';
import { ScanResult, useBarcodeScannerContext } from '@common/utils';
import React, { useEffect, useRef, useState } from 'react';
import { useOutbound } from '../../OutboundShipment/api';
import { BarcodeNode, InvoiceLineNode } from '@common/types';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';

interface Message {
  type: 'error' | 'warning' | 'info';
  text: string;
}

interface ScanInputModalProps {
  lines: InvoiceLineNode[];
}

interface FormDraftState {
  item: ItemStockOnHandFragment | null;
  batch: string;
  expiryDate: Date | null;
  packSize: number;
  quantity: number;
  //   manufacturerDate: Date | null;
  isNewLine: boolean;
  newGtin?: string;

  barcodeContent: string;
}

export const ScanInputModal = ({ lines }: ScanInputModalProps) => {
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, isEnabled, isScanning, stopScan, startScanning } =
    useBarcodeScannerContext();
  const [barcodeItem, setBarcodeItem] = useState<BarcodeNode | null>(null);
  //   const [message, setMessage] = useState<Message | null>(null);
  const [draftState, setDraftState] = useState<FormDraftState>({
    item: null,
    batch: '',
    expiryDate: null,
    packSize: 1,
    quantity: 0,

    //
    isNewLine: true,
    barcodeContent: '',
  });

  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();

  const handleScan = async (barcode: ScanResult) => {
    const newState = { ...draftState };
    console.log('Scanned barcode:', barcode);
    newState.barcodeContent = barcode.content ?? '';
    if (!isOpen) {
      setIsOpen(true);
    }
    const { content, gtin, batch, expiryDate } = barcode;
    const barcodeOrGtin = gtin ?? content;
    console.log('Fetching barcode data for:', barcodeOrGtin);
    if (barcodeOrGtin) {
      const dbBarcodeData = (await getBarcode(barcodeOrGtin)) as BarcodeNode;
      if (!dbBarcodeData?.id) {
        newState.newGtin = barcodeOrGtin;
        newState.isNewLine = true;
        // setMessage({
        //   type: 'info',
        //   text: `GTIN ${barcodeOrGtin} is new and not found in the system.`,
        // });
        setBarcodeItem(null);
      } else setBarcodeItem(dbBarcodeData);
      if (batch) newState.batch = batch;
      if (expiryDate) newState.expiryDate = new Date(expiryDate);
      //   if (packSize) newState.packSize = packSize;
      //   if (quantity) newState.quantity = quantity;
      console.log('newState', newState);
    }
    setDraftState(newState);

    // console.log('Fetched barcode data:', fetchedBarcode);
  };

  console.log('draftState', draftState);

  const existingLine = lines.find(line => line.batch === draftState.batch);

  console.log('existingLine', existingLine);

  useEffect(() => {
    if (isEnabled && isConnected) {
      startScanning(handleScan);
    }

    return () => {
      stopScan();
    };
  }, []);

  const onChangeItem = (item: ItemStockOnHandFragment | null) => {};

  console.log('barcodeItem', barcodeItem);

  const message: Message = !barcodeItem
    ? {
        type: 'warning',
        text: 'Unknown GTIN or barcode. Select an item to associate with this GTIN',
      }
    : !existingLine
      ? {
          type: 'warning',
          text: 'Batch not found in existing lines. A new line will be created.',
        }
      : {
          type: 'info',
          text: `Batch already exists with a quantity of ${existingLine.numberOfPacks} units. The new quantity will be added to this line.`,
        };

  return (
    <BasicModal
      open={isOpen}
      sx={{
        padding: 4,
        display: 'flex',
        gap: 2,
      }}
      width={400}
      height={200}
    >
      <Typography>
        <strong>Scan Product</strong>
      </Typography>
      <Typography>
        <strong>Barcode:</strong> {draftState.barcodeContent}
      </Typography>
      <Alert severity={message.type}>{message.text}</Alert>
      <InputWithLabelRow
        label="Item"
        Input={
          <StockItemSearchInput
            autoFocus={!barcodeItem}
            // openOnFocus={!barcodeItem}
            disabled={!!barcodeItem}
            currentItemId={barcodeItem?.itemId}
            onChange={newItem => onChangeItem(newItem)}
            // filter={{ id: { notEqualAll: existingItemIds } }}
            // A scanned-in item will only have an ID, not a full item object,
            // so this flag makes the StockItemSearchInput component update the
            // current item on initial load from the API
            initialUpdate
          />
        }
      />
      <InputWithLabelRow
        label={t('label.batch')}
        Input={
          <BasicTextInput
            value={draftState.batch ?? ''}
            onChange={e =>
              setDraftState(current => ({ ...current, batch: e.target.value }))
            }
          />
        }
      />
      <InputWithLabelRow
        label={t('label.expiry-date')}
        Input={
          <DatePicker
            value={draftState.expiryDate}
            onChange={value =>
              setDraftState(current => ({ ...current, expiryDate: value }))
            }
          />
        }
      />
      <InputWithLabelRow
        label={t('label.pack-size')}
        Input={
          <NumericTextInput
            value={draftState.packSize ?? ''}
            onChange={value =>
              setDraftState(current => ({ ...current, packSize: value || 1 }))
            }
          />
        }
      />
      <InputWithLabelRow
        label={t('label.quantity')}
        Input={
          <NumericTextInput
            value={draftState.quantity ?? ''}
            onChange={value =>
              setDraftState(current => ({ ...current, quantity: value || 1 }))
            }
          />
        }
      />
      {/* TO-DO: Manufacture Date */}
      {/* <InputWithLabelRow
        label={t('label.quantity')}
        Input={
          <NumericTextInput
            value={draftState.quantity ?? ''}
            onChange={value =>
              setDraftState(current => ({ ...current, quantity: value || 1 }))
            }
          />
        }
      /> */}
    </BasicModal>
  );
};
