import {
  DialogButton,
  InputWithLabelRow,
  Typography,
  useTranslation,
  BasicTextInput,
  NumericTextInput,
  DatePicker,
  Alert,
  useDialog,
  Box,
  TypedTFunction,
  LocaleKey,
} from '@openmsupply-client/common';
import { FnUtils, ScanResult, useBarcodeScannerContext } from '@common/utils';
import React, { useEffect, useState } from 'react';
import { useOutbound } from '../../OutboundShipment/api';
import {
  BarcodeNode,
  InvoiceLineNode,
  InvoiceLineNodeType,
} from '@common/types';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { useDraftInboundLines } from '../api';
import { DraftInboundLine } from '../../types';

interface Message {
  type: 'error' | 'warning' | 'info';
  text: string;
}

interface ScanInputModalProps {
  lines: InvoiceLineNode[];
  invoiceId: string;
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

  // The raw barcode string
  barcodeContent: string;
}

const defaultDraftState: FormDraftState = {
  item: null,
  batch: '',
  expiryDate: null,
  packSize: 1,
  quantity: 0,

  //
  isNewLine: true,
  barcodeContent: '',
};

export const ScanInputModal = ({ lines, invoiceId }: ScanInputModalProps) => {
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, isEnabled, stopScan, startScanning } =
    useBarcodeScannerContext();
  const [barcodeData, setBarcodeData] = useState<BarcodeNode | null>(null);
  const [draftState, setDraftState] =
    useState<FormDraftState>(defaultDraftState);

  const { saveSingleLine } = useDraftInboundLines(barcodeData?.itemId);

  const { Modal } = useDialog({ isOpen });

  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();
  const { mutateAsync: saveBarcode } = useOutbound.utils.barcodeInsert();

  const existingLine = lines.find(line => line.batch === draftState.batch);

  const handleScan = async (barcode: ScanResult) => {
    const newState = { ...draftState };

    newState.barcodeContent = barcode.content ?? '';
    if (!isOpen) {
      setIsOpen(true);
    }

    const {
      content,
      gtin,
      batch,
      expiryDate,
      // packSize, quantity -- TO-DO
    } = barcode;

    const barcodeOrGtin = gtin ?? content;

    if (barcodeOrGtin) {
      const dbBarcodeData = (await getBarcode(barcodeOrGtin)) as BarcodeNode;
      if (!dbBarcodeData?.id) {
        // Only save as new GTIN if barcode has one, otherwise ignore (for now)
        if (gtin) newState.newGtin = barcodeOrGtin;
        newState.isNewLine = true;
      } else {
        setBarcodeData(dbBarcodeData);
      }

      if (batch) newState.batch = batch;
      if (expiryDate) newState.expiryDate = new Date(expiryDate);
      //   if (packSize) newState.packSize = packSize;
      //   if (quantity) newState.quantity = quantity;
    }
    setDraftState(newState);
  };

  useEffect(() => {
    if (isEnabled && isConnected) {
      startScanning(handleScan);
    }

    return () => {
      stopScan();
    };
  }, []);

  const onChangeItem = (item: ItemStockOnHandFragment | null) => {
    setDraftState(current => ({
      ...current,
      item,
      packSize: barcodeData?.packSize || item?.defaultPackSize || 1,
    }));
  };

  const message: Message = getMessage(barcodeData, draftState, existingLine, t);

  const isFormValid =
    (!!draftState.item || !!barcodeData) && draftState.quantity > 0;

  return (
    <Modal
      title={t('heading.scan-product')}
      width={500}
      disableEnforceFocus // Prevents input block in Mock barcode scanner element
      okButton={
        <DialogButton
          variant="ok"
          disabled={!isFormValid}
          onClick={async () => {
            try {
              const updatedLine: Partial<DraftInboundLine> = {
                type: InvoiceLineNodeType.StockIn,
                batch: draftState.batch.trim(),
                expiryDate: draftState.expiryDate
                  ? draftState.expiryDate.toISOString().substring(0, 10)
                  : null,
                packSize: draftState.packSize,
                numberOfPacks:
                  (existingLine?.numberOfPacks || 0) + draftState.quantity,
              };
              if (existingLine) {
                updatedLine.id = existingLine.id;
                updatedLine.isUpdated = true;
              } else {
                updatedLine.id = FnUtils.generateUUID();
                updatedLine.isCreated = true;
                updatedLine.invoiceId = invoiceId;
                updatedLine.sellPricePerPack = 0;
                updatedLine.costPricePerPack = 0;
              }
              if (draftState.item) {
                updatedLine.item = draftState.item;
              } else
                updatedLine.item = {
                  id: barcodeData?.itemId || '',
                } as ItemStockOnHandFragment;
              console.log('Existing line:', existingLine);

              await saveSingleLine(updatedLine);

              if (draftState.newGtin) {
                // Save new barcode to database
                await saveBarcode({
                  input: {
                    gtin: draftState.newGtin,
                    itemId: draftState.item?.id!,
                    packSize: draftState.packSize,
                  },
                });
              }
              setDraftState(defaultDraftState);
              setBarcodeData(null);
              setIsOpen(false);
            } catch (e) {
              //   error((e as Error).message)();
            }
          }}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setDraftState(defaultDraftState);
            setBarcodeData(null);
            setIsOpen(false);
          }}
        />
      }
    >
      <Box
        display="flex"
        // justifyContent="space-between"
        // alignItems="center"
        flexDirection="column"
        gap={1}
      >
        <Typography>
          <strong>{t('label.barcode')}:</strong> {draftState.barcodeContent}
        </Typography>
        <Alert severity={message.type}>{message.text}</Alert>
        <InputWithLabelRow
          label={t('label.item')}
          Input={
            <StockItemSearchInput
              autoFocus={!barcodeData}
              // openOnFocus={!barcodeItem}
              disabled={!!barcodeData}
              currentItemId={draftState.item?.id || barcodeData?.itemId || null}
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
                setDraftState(current => ({
                  ...current,
                  batch: e.target.value,
                }))
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
      </Box>
    </Modal>
  );
};

const getMessage = (
  barcodeData: BarcodeNode | null,
  draftState: FormDraftState,
  existingLine: InvoiceLineNode | undefined,
  t: TypedTFunction<LocaleKey>
): Message => {
  if (!barcodeData && !draftState.newGtin && !draftState.item)
    return {
      type: 'error',
      text: t('messages.unknown-barcode-no-gtin'),
    };

  if (!barcodeData && !!draftState.newGtin && !draftState.item)
    return {
      type: 'warning',
      text: t('messages.unknown-gtin'),
    };

  if (!existingLine)
    return {
      type: 'warning',
      text: t('messages.batch-not-found'),
    };

  return {
    type: 'info',
    text: t('messages.batch-already-exists', {
      numberOfPacks: existingLine.numberOfPacks,
    }),
  };
};
