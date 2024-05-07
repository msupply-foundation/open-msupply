import React, { useEffect, useState } from 'react';
import {
  Typography,
  DialogButton,
  Grid,
  useDialog,
  InlineSpinner,
  Box,
  useTranslation,
  ModalMode,
  useBufferState,
  useDirtyCheck,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  useKeyboardHeightAdjustment,
  InvoiceLineNodeType,
  useNotification,
  InvoiceNodeStatus,
  DateUtils,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { OutboundLineEditForm } from './OutboundLineEditForm';
import { useDraftOutboundLines, useNextItem } from './hooks';
import { useOutbound } from '../../api';
import { getPackQuantityCellId } from '../../../utils';
import { Draft, DraftItem } from '../../..';
import {
  PackSizeController,
  allocateQuantities,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import {
  CurrencyRowFragment,
  ItemRowFragment,
} from '@openmsupply-client/system';

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft | null;
  mode: ModalMode | null;
}

const useFocusNumberOfPacksInput = (draft: Draft | null) => {
  const batch = draft?.barcode?.batch;

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

export const OutboundLineEdit: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  draft,
  mode,
}) => {
  const item = !draft ? null : draft.item ?? null;
  const t = useTranslation('distribution');
  const { info } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);
  const [okDisabled, setOkDisabled] = useState(false);

  const { mutateAsync: insertBarcode } = useOutbound.utils.barcodeInsert();
  const { status, currency, otherParty } = useOutbound.document.fields([
    'status',
    'currency',
    'otherParty',
  ]);
  const { mutateAsync } = useOutbound.line.save(status);
  const isDisabled = useOutbound.utils.isDisabled();
  const {
    draftStockOutLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
  } = useDraftOutboundLines(currentItem);
  const packSizeController = usePackSizeController(
    currentItem,
    draftStockOutLines
  );
  const { next, disabled: nextDisabled } = useNextItem(currentItem?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const height = useKeyboardHeightAdjustment(700);
  const { warning } = useNotification();
  const [showZeroQuantityConfirmation, setShowZeroQuantityConfirmation] =
    useState(false);
  useFocusNumberOfPacksInput(draft);

  const placeholder = draftStockOutLines?.find(
    ({ type, numberOfPacks }) =>
      type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
  );

  const onUpdateQuantity = (batchId: string, quantity: number) => {
    updateQuantity(batchId, quantity);
    setIsAutoAllocated(false);
  };

  const onSave = async () => {
    if (!isDirty) return;

    await mutateAsync(draftStockOutLines);
    if (!draft) return;

    const { barcode } = draft;
    const barcodeExists = !!barcode?.id;

    if (!barcode || !currentItem || barcodeExists) return;

    // it is possible for the user to select multiple batch lines
    // if the scanned barcode does not contain a batch number
    // however the scanned barcode can only relate to a specific pack size and therefore batch
    const packSize = draftStockOutLines.find(line => line.numberOfPacks > 0)
      ?.packSize;

    const input = {
      input: {
        gtin: barcode.gtin,
        itemId: currentItem?.id,
        packSize,
      },
    };

    try {
      await insertBarcode(input);
    } catch (error) {
      warning(t('error.unable-to-save-barcode', { error }))();
    }
  };

  const onAllocate = (
    newVal: number,
    packSize: number | null,
    autoAllocated = false
  ) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftStockOutLines
    )(newVal, packSize);
    setIsDirty(true);
    setDraftStockOutLines(newAllocateQuantities ?? draftStockOutLines);
    setIsAutoAllocated(autoAllocated);
    if (showZeroQuantityConfirmation && newVal !== 0)
      setShowZeroQuantityConfirmation(false);

    return newAllocateQuantities;
  };

  const canAutoAllocate = !!(currentItem && draftStockOutLines.length);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;

  const handleSave = async (onSaved: () => boolean | void) => {
    if (
      getAllocatedQuantity(draftStockOutLines) === 0 &&
      !showZeroQuantityConfirmation
    ) {
      setShowZeroQuantityConfirmation(true);
      return;
    }

    try {
      await onSave();
      setIsDirty(false);
      if (!!placeholder) {
        const infoSnack = info(t('message.placeholder-line'));
        infoSnack();
      }
      setShowZeroQuantityConfirmation(false);

      return onSaved();
    } catch (e) {
      // console.error(e);
    }
  };

  const onNext = async () => {
    const onSaved = () => {
      if (mode === ModalMode.Update && next) {
        setCurrentItem(next);
        return true;
      }
      if (mode === ModalMode.Create) {
        setCurrentItem(null);
        return true;
      }
      onClose();
    };

    // Returning true here triggers the slide animation
    return await handleSave(onSaved);
  };

  const hasOnHold = draftStockOutLines.some(
    ({ stockLine }) =>
      (stockLine?.availableNumberOfPacks ?? 0) > 0 && !!stockLine?.onHold
  );
  const hasExpired = draftStockOutLines.some(
    ({ stockLine }) =>
      (stockLine?.availableNumberOfPacks ?? 0) > 0 &&
      !!stockLine?.expiryDate &&
      DateUtils.isExpired(new Date(stockLine?.expiryDate))
  );

  return (
    <Modal
      title={t(
        mode === ModalMode.Update ? 'heading.edit-item' : 'heading.add-item'
      )}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={okNextDisabled}
          variant="next"
          onClick={onNext}
        />
      }
      okButton={
        <DialogButton
          disabled={!currentItem || okDisabled}
          variant="ok"
          onClick={() => handleSave(onClose)}
        />
      }
      height={height}
      width={1000}
    >
      <Grid container gap={0.5}>
        <OutboundLineEditForm
          disabled={mode === ModalMode.Update || isDisabled}
          packSizeController={packSizeController}
          onChangeItem={(item: ItemRowFragment | null) => {
            if (status === InvoiceNodeStatus.New) setIsDirty(true);
            setIsAutoAllocated(false);
            setCurrentItem(item);
          }}
          item={currentItem}
          allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
          availableQuantity={sumAvailableQuantity(draftStockOutLines)}
          onChangeQuantity={onAllocate}
          canAutoAllocate={canAutoAllocate}
          isAutoAllocated={isAutoAllocated}
          showZeroQuantityConfirmation={showZeroQuantityConfirmation}
          hasOnHold={hasOnHold}
          hasExpired={hasExpired}
          setOkDisabled={setOkDisabled}
          draftStockOutLines={draftStockOutLines}
        />

        <TableWrapper
          canAutoAllocate={canAutoAllocate}
          currentItem={currentItem}
          isLoading={isLoading}
          packSizeController={packSizeController}
          updateQuantity={onUpdateQuantity}
          draftOutboundLines={draftStockOutLines}
          allocatedQuantity={getAllocatedQuantity(draftStockOutLines)}
          batch={draft?.barcode?.batch}
          currency={currency}
          isExternalSupplier={!otherParty?.store}
        />
      </Grid>
    </Modal>
  );
};

interface TableProps {
  canAutoAllocate: boolean;
  currentItem: DraftItem | null;
  isLoading: boolean;
  packSizeController: PackSizeController;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
  draftOutboundLines: DraftStockOutLine[];
  allocatedQuantity: number;
  batch?: string;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftOutboundLines,
  allocatedQuantity,
  batch,
  currency,
  isExternalSupplier,
}) => {
  const t = useTranslation('distribution');

  if (!currentItem) return null;

  if (isLoading)
    return (
      <Box
        display="flex"
        flex={1}
        height={400}
        justifyContent="center"
        alignItems="center"
      >
        <InlineSpinner />
      </Box>
    );

  if (!canAutoAllocate)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <OutboundLineEditTable
        packSizeController={packSizeController}
        onChange={updateQuantity}
        rows={draftOutboundLines}
        item={currentItem}
        batch={batch}
        allocatedQuantity={allocatedQuantity}
        currency={currency}
        isExternalSupplier={isExternalSupplier}
      />
    </TableProvider>
  );
};
