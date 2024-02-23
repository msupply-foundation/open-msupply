import React, { useState } from 'react';
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
import { useDraftPrescriptionLines, useNextItem } from './hooks';
import { usePrescription } from '../../api';
import { Draft, DraftItem } from '../../..';
import {
  PackSizeController,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
  allocateQuantities,
} from '../../../StockOut';
import { DraftStockOutLine } from '../../../types';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { ItemRowFragment } from '@openmsupply-client/system';

interface PrescriptionLineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft | null;
  mode: ModalMode | null;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditModalProps> = ({
  isOpen,
  onClose,
  draft,
  mode,
}) => {
  const item = !draft ? null : draft.item ?? null;
  const t = useTranslation(['dispensary']);
  const { info } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const [currentItem, setCurrentItem] = useBufferState(item);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);
  const [showZeroQuantityConfirmation, setShowZeroQuantityConfirmation] =
    useState(false);
  const { status, id: invoiceId } = usePrescription.document.fields([
    'status',
    'id',
  ]);
  const { mutateAsync } = usePrescription.line.save();
  const isDisabled = usePrescription.utils.isDisabled();
  const {
    draftStockOutLines: draftPrescriptionLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
    updateNotes,
  } = useDraftPrescriptionLines(currentItem);
  const packSizeController = usePackSizeController(draftPrescriptionLines);
  const { next, disabled: nextDisabled } = useNextItem(currentItem?.id);
  const { isDirty, setIsDirty } = useDirtyCheck();
  const height = useKeyboardHeightAdjustment(700);

  const placeholder = draftPrescriptionLines?.find(
    ({ type, numberOfPacks }) =>
      type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks !== 0
  );

  const onUpdateQuantity = (batchId: string, quantity: number) => {
    updateQuantity(batchId, quantity);
    setIsAutoAllocated(false);
  };

  const onUpdateNotes = (note: string) => {
    updateNotes(note);
    setIsAutoAllocated(false);
  };

  const onSave = async () => {
    if (!isDirty) return;

    // needed since placeholders aren't being created for prescriptions yet, but still adding to array
    const isOnHold = draftPrescriptionLines.some(
      ({ stockLine, location }) => stockLine?.onHold || location?.onHold
    );

    const patch =
      status !== InvoiceNodeStatus.Picked &&
      draftPrescriptionLines.length >= 1 &&
      !isOnHold
        ? {
            id: invoiceId,
            status: InvoiceNodeStatus.Picked,
          }
        : undefined;

    await mutateAsync({ draftPrescriptionLines, patch });

    if (!draft) return;
  };

  const onAllocate = (
    newVal: number,
    packSize: number | null,
    autoAllocated = false
  ) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftPrescriptionLines
    )(newVal, packSize);
    setIsDirty(true);
    setDraftStockOutLines(newAllocateQuantities ?? draftPrescriptionLines);
    setIsAutoAllocated(autoAllocated);
    if (showZeroQuantityConfirmation && newVal !== 0)
      setShowZeroQuantityConfirmation(false);

    return newAllocateQuantities;
  };

  const canAutoAllocate = !!(currentItem && draftPrescriptionLines.length);
  const okNextDisabled =
    (mode === ModalMode.Update && nextDisabled) || !currentItem;

  const handleSave = async (onSaved: () => boolean | void) => {
    if (
      getAllocatedQuantity(draftPrescriptionLines) === 0 &&
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

  const hasOnHold = draftPrescriptionLines.some(
    ({ stockLine }) =>
      (stockLine?.availableNumberOfPacks ?? 0) > 0 && !!stockLine?.onHold
  );
  const hasExpired = draftPrescriptionLines.some(
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
          disabled={!currentItem}
          variant="ok"
          onClick={() => handleSave(onClose)}
        />
      }
      height={height}
      width={1000}
    >
      <Grid container gap={0.5}>
        <PrescriptionLineEditForm
          disabled={mode === ModalMode.Update || isDisabled}
          packSizeController={packSizeController}
          onChangeItem={(item: ItemRowFragment | null) => {
            if (status === InvoiceNodeStatus.New) setIsDirty(true);
            setCurrentItem(item);
          }}
          item={currentItem}
          allocatedQuantity={getAllocatedQuantity(draftPrescriptionLines)}
          availableQuantity={sumAvailableQuantity(draftPrescriptionLines)}
          onChangeQuantity={onAllocate}
          canAutoAllocate={canAutoAllocate}
          isAutoAllocated={isAutoAllocated}
          updateNotes={onUpdateNotes}
          draftPrescriptionLines={draftPrescriptionLines}
          showZeroQuantityConfirmation={showZeroQuantityConfirmation}
          hasOnHold={hasOnHold}
          hasExpired={hasExpired}
        />

        <TableWrapper
          canAutoAllocate={canAutoAllocate}
          currentItem={currentItem}
          isLoading={isLoading}
          packSizeController={packSizeController}
          updateQuantity={onUpdateQuantity}
          draftPrescriptionLines={draftPrescriptionLines}
          allocatedQuantity={getAllocatedQuantity(draftPrescriptionLines)}
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
  draftPrescriptionLines: DraftStockOutLine[];
  allocatedQuantity: number;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftPrescriptionLines,
  allocatedQuantity,
}) => {
  const t = useTranslation('dispensary');

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
      <PrescriptionLineEditTable
        packSizeController={packSizeController}
        onChange={updateQuantity}
        rows={draftPrescriptionLines}
        item={currentItem}
        allocatedQuantity={allocatedQuantity}
      />
    </TableProvider>
  );
};
