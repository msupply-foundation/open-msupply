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
  useNotification,
  LoadingButton,
  CheckIcon,
} from '@openmsupply-client/common';
import { FnUtils, ScanResult, useBarcodeScannerContext } from '@common/utils';
import React, { useCallback, useState } from 'react';
import { useOutbound } from '../../OutboundShipment/api';
import { BarcodeNode, InvoiceLineNodeType } from '@common/types';
import {
  ItemStockOnHandFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { InboundLineFragment, useDraftInboundLines } from '../api';
import { DraftInboundLine } from '../../types';

interface Message {
  type: 'error' | 'warning' | 'info';
  text: string;
}

interface ScanInputModalProps {
  lines: InboundLineFragment[];
  invoiceId: string;
  shouldOpen?: boolean;
}

interface FormDraftState {
  itemId: string | null;
  batch: string;
  expiryDate: Date | null;
  packSize: number;
  quantity: number;
  manufactureDate: Date | null;
  isNewLine: boolean;
  gtin: string | null;
  saveNewBarcode: boolean;

  // The raw barcode string
  barcodeContent: string;
}

const defaultDraftState: FormDraftState = {
  itemId: null,
  batch: '',
  expiryDate: null,
  packSize: 1,
  quantity: 0,
  manufactureDate: null,
  gtin: null,
  saveNewBarcode: false,
  isNewLine: true,
  barcodeContent: '',
};

export const ScanInputModal = ({
  lines,
  invoiceId,
  shouldOpen = false,
}: ScanInputModalProps) => {
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { warning } = useNotification();
  const { Modal } = useDialog({ isOpen });

  const [barcodeData, setBarcodeData] = useState<BarcodeNode | null>(null);
  const [draftState, setDraftState] =
    useState<FormDraftState>(defaultDraftState);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const { success } = useNotification();

  const { saveSingleLine, isLoading: isSavingLine } = useDraftInboundLines(
    barcodeData?.itemId
  );
  const { mutateAsync: getBarcode, isLoading: isFetchingBarcode } =
    useOutbound.utils.barcode();
  const { mutateAsync: saveBarcode, isLoading: isSavingBarcode } =
    useOutbound.utils.barcodeInsert();

  // Helper to update state and pull in expiry/manufacture date from matching line
  const updateStateWithLineMatch = useCallback(
    (updates: Partial<FormDraftState>) => {
      setDraftState(current => {
        const newState = { ...current, ...updates };

        // Find matching line based on updated values
        // Note: not checking against manufacturer date for now
        const matchingLine = lines.find(
          line =>
            line.batch === newState.batch &&
            line.item.id === newState.itemId &&
            line.packSize === newState.packSize
        );

        // If we found a matching line with an expiry date and we don't already have one, use it
        if (matchingLine?.expiryDate && !newState.expiryDate) {
          newState.expiryDate = new Date(matchingLine.expiryDate);
        }

        // Same for manufacture date
        if (matchingLine?.manufactureDate && !newState.manufactureDate) {
          newState.manufactureDate = new Date(matchingLine.manufactureDate);
        }

        return newState;
      });
    },
    [lines]
  );

  const existingLine = lines.find(
    line =>
      line.batch === draftState.batch &&
      line.item.id === draftState.itemId &&
      line.packSize === draftState.packSize
  );

  // Callback ref to focus quantity input when item is selected
  const quantityInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node && draftState.itemId) {
        node.focus();
      }
    },
    [draftState.itemId]
  );

  // Shared function to save the current line
  const saveCurrentLine = useCallback(
    async (shouldReopen: boolean = false) => {
      const updatedLine: Partial<DraftInboundLine> = {
        type: InvoiceLineNodeType.StockIn,
        batch: draftState.batch.trim(),
        expiryDate: draftState.expiryDate
          ? draftState.expiryDate.toISOString().substring(0, 10)
          : null,
        manufactureDate: draftState.manufactureDate
          ? draftState.manufactureDate.toISOString().substring(0, 10)
          : null,
        packSize: draftState.packSize,
        numberOfPacks: (existingLine?.numberOfPacks || 0) + draftState.quantity,
        item: {
          id: draftState.itemId || '',
        } as ItemStockOnHandFragment,
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

      await saveSingleLine(updatedLine);

      success(t('messages.inbound-shipment-line-saved'))();

      if (draftState.saveNewBarcode && draftState.gtin && draftState.itemId) {
        await saveBarcode({
          input: {
            gtin: draftState.gtin,
            itemId: draftState.itemId,
            packSize: draftState.packSize,
            manufactureDate: draftState.manufactureDate
              ? draftState.manufactureDate.toISOString().substring(0, 10)
              : null,
          },
        });
      }

      setDraftState(defaultDraftState);
      setBarcodeData(null);
      setErrorMessage(undefined);

      if (shouldReopen) {
        // Keep modal open for next scan
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    },
    [
      draftState,
      existingLine,
      invoiceId,
      saveSingleLine,
      saveBarcode,
      success,
      t,
    ]
  );

  const handleScan = useCallback(
    async (barcode: ScanResult) => {
      if (!shouldOpen) {
        console.warn(
          'Scan received but shouldOpen is false, not opening modal to show scan result'
        );
        warning(t('messages.scan-disabled-warning'))();
        return;
      }

      // Check if a new GTIN is scanned while we already have one
      // We treat even the same GTIN as a new one, because they might be scanning a bunch of the same product and want the modal to auto-save and reset for each one
      if (isOpen && draftState.gtin && barcode.gtin) {
        // New GTIN scanned - validate and auto-save current line
        setErrorMessage(undefined);

        if (!draftState.itemId) {
          setErrorMessage(t('error.barcode-scanner-save-no-item-selected'));
          return;
        }

        if (draftState.quantity <= 0) {
          setErrorMessage(t('error.barcode-scanner-save-no-quantity-entered'));
          return;
        }

        // Valid state - save current line
        try {
          await saveCurrentLine(true);
        } catch (error) {
          console.error(
            'Error auto-saving draft invoice line on new GTIN scan',
            error
          );
          setErrorMessage(
            t('error.barcode-scanner-auto-save-failed') + ' ' + error
          );
          return;
        }
      }

      // After successful save, process the new scan
      if (!isOpen) {
        setIsOpen(true);
      }

      setErrorMessage(undefined);
      const { content, gtin, batch, expiryDate, packSize, quantity } = barcode;

      // Perform async lookup first if needed
      const barcodeToLookup = gtin ?? content;
      let dbBarcodeData: BarcodeNode | null = null;

      // Lookup barcode in the database to get associated item and pack size
      if (barcodeToLookup) {
        // Ideally we only look up the barcode if we haven't already associated it with an item.
        // Note if/when we want to support automatically saving new barcodes when a GTIN is scanned, this logic will need to change to allow the lookup to happen even if we have an item ID from a previous scan.
        // So maybe it's good to do it everytime?
        dbBarcodeData = (await getBarcode(barcodeToLookup)) as BarcodeNode;
      }

      // Then update state
      setDraftState(currentState => {
        const newState = { ...currentState };

        newState.barcodeContent = barcode.content ?? '';

        if (gtin) newState.gtin = gtin;

        if (barcodeToLookup) {
          if (!dbBarcodeData?.id) {
            // We didn't find the barcode in the database.
            // If we do have a gtin in the scan, save the association for next
            // time we scan.
            // We only do this for real GTIN scans otherwise expiry date data
            // might be saved as a barcode and associated with the item
            // accidentally.
            if (newState.gtin && !currentState.itemId)
              newState.saveNewBarcode = true;
          } else {
            // We found a matching barcode in the database, so populate item and
            // pack size from that
            setBarcodeData(dbBarcodeData);

            newState.itemId = dbBarcodeData.itemId;
            if (dbBarcodeData.packSize)
              newState.packSize = dbBarcodeData.packSize;
            if (dbBarcodeData.manufactureDate)
              newState.manufactureDate = new Date(
                dbBarcodeData.manufactureDate
              );
            newState.gtin = dbBarcodeData.gtin;
          }
        }
        if (batch) newState.batch = batch;
        if (expiryDate) {
          newState.expiryDate = new Date(expiryDate);
        }

        if (packSize) newState.packSize = packSize;
        if (quantity) newState.quantity = quantity;

        return newState;
      });
    },
    [isOpen, shouldOpen, getBarcode, draftState, t, saveCurrentLine]
  );

  // Register the scan handler so it runs on scan events when context is
  // listening
  const { mockScannerEnabled } = useBarcodeScannerContext(handleScan);

  const onChangeItem = (item: ItemStockOnHandFragment | null) => {
    updateStateWithLineMatch({
      itemId: item?.id || null,
      packSize: barcodeData?.packSize || item?.defaultPackSize || 1,
    });
  };

  const message: Message | null = errorMessage
    ? { type: 'error', text: errorMessage }
    : getMessage(barcodeData, draftState, existingLine, t);

  const canSubmit =
    (!!draftState.itemId || !!barcodeData) && draftState.quantity > 0;

  const handleSubmit = async () => {
    try {
      await saveCurrentLine(false);
    } catch (error) {
      console.error('Error saving draft invoice line', error);
      setErrorMessage(
        t('error.barcode-scanner-auto-save-failed') + ' ' + error
      );
    }
  };

  const isLoading = isFetchingBarcode || isSavingLine || isSavingBarcode;

  return (
    <Modal
      title={t('heading.scan-product')}
      width={500}
      disableEnforceFocus // Prevents input block in Mock barcode scanner element
      okButton={
        <LoadingButton
          startIcon={<CheckIcon />}
          color="secondary"
          variant="contained"
          isLoading={isLoading}
          disabled={!canSubmit}
          label={t('button.ok')}
          onClick={handleSubmit}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            setDraftState(defaultDraftState);
            setBarcodeData(null);
            setErrorMessage(undefined);
            setIsOpen(false);
          }}
        />
      }
    >
      <Box display="flex" flexDirection="column" gap={1}>
        {/* only show raw barcode content in mock scanner mode for testing purposes */}
        {mockScannerEnabled && (
          <Typography>
            <strong>{t('label.barcode')}:</strong>{' '}
            {draftState.barcodeContent.length > 10
              ? `${draftState.barcodeContent.slice(0, 10)}...`
              : draftState.barcodeContent}
          </Typography>
        )}
        {draftState.gtin && mockScannerEnabled && (
          <Typography>
            <strong>{t('label.gtin')}:</strong> {draftState.gtin}
          </Typography>
        )}

        {message && !isLoading && (
          <Alert severity={message.type}>{message.text}</Alert>
        )}
        <InputWithLabelRow
          label={t('label.item')}
          Input={
            <StockItemSearchInput
              autoFocus={!barcodeData}
              disabled={!!barcodeData || isLoading}
              currentItemId={barcodeData?.itemId || draftState.itemId || null}
              onChange={newItem => onChangeItem(newItem)}
              // A scanned-in item will only have an ID, not a full item object,
              // so this flag makes the StockItemSearchInput component update
              // the current item on initial load from the API
              initialUpdate
            />
          }
        />
        <InputWithLabelRow
          label={t('label.batch')}
          Input={
            <BasicTextInput
              value={draftState.batch ?? ''}
              disabled={isLoading}
              onChange={e => {
                updateStateWithLineMatch({ batch: e.target.value });
              }}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.expiry-date')}
          Input={
            <DatePicker
              value={draftState.expiryDate}
              disabled={isLoading}
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
                updateStateWithLineMatch({ packSize: value || 1 })
              }
              // If a pack size is associated with a particular GTIN, it should
              // not change
              disabled={!!barcodeData?.packSize || isLoading}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.quantity')}
          Input={
            <NumericTextInput
              inputRef={quantityInputRef}
              value={draftState.quantity ?? ''}
              disabled={isLoading}
              onChange={value =>
                setDraftState(current => ({ ...current, quantity: value ?? 0 }))
              }
            />
          }
        />
        <InputWithLabelRow
          label={t('label.manufacture-date')}
          Input={
            <DatePicker
              value={draftState.manufactureDate}
              // If a manufacture date is associated with a particular GTIN, it
              // should not change
              disabled={!!barcodeData?.manufactureDate || isLoading}
              onChange={value =>
                setDraftState(current => ({
                  ...current,
                  manufactureDate: value,
                }))
              }
            />
          }
        />
      </Box>
    </Modal>
  );
};

const getMessage = (
  barcodeData: BarcodeNode | null,
  draftState: FormDraftState,
  existingLine: InboundLineFragment | undefined,
  t: TypedTFunction<LocaleKey>
): Message | null => {
  if (!barcodeData && !draftState.gtin && !draftState.itemId)
    return {
      type: 'error',
      text: t('messages.no-matching-barcode-and-no-gtin'),
    };

  if (!barcodeData && !!draftState.gtin && !draftState.itemId)
    return {
      type: 'warning',
      text: t('messages.no-matching-barcode-but-gtin-found'),
    };

  if (!existingLine)
    return {
      type: 'info',
      text: t('messages.batch-not-found'),
    };

  return {
    type: 'info',
    text: t('messages.batch-already-exists', {
      numberOfPacks: existingLine.numberOfPacks,
    }),
  };
};
