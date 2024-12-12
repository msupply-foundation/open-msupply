import React, { useState } from 'react';
import {
  Typography,
  Grid,
  InlineSpinner,
  Box,
  useTranslation,
  ModalMode,
  useBufferState,
  useDirtyCheck,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  InvoiceLineNodeType,
  useNotification,
  InvoiceNodeStatus,
  DateUtils,
  useConfirmOnLeaving,
} from '@openmsupply-client/common';
import { useDraftPrescriptionLines, usePreviousNextItem } from './hooks';
import { usePrescription } from '../api';
import { Draft, DraftItem } from '../..';
import {
  PackSizeController,
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
  allocateQuantities,
} from '../../StockOut';
import { DraftStockOutLine } from '../../types';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { ItemRowFragment } from '@openmsupply-client/system';
import { usePrescriptionLines } from '../api/hooks/usePrescriptionLines';
import { Footer } from './Footer';

interface PrescriptionLineEditModalProps {
  draft: Draft | null;
  mode: ModalMode | null;
  items: ItemRowFragment[];
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditModalProps> = ({
  draft,
  mode,
  items,
}) => {
  const item = !draft ? null : (draft.item ?? null);
  const t = useTranslation();
  const { info } = useNotification();
  const [currentItem, setCurrentItem] = useBufferState(item);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);
  const [showZeroQuantityConfirmation, setShowZeroQuantityConfirmation] =
    useState(false);
  const {
    query: { data },
    isDisabled,
  } = usePrescription();
  const {
    status = InvoiceNodeStatus.New,
    id: invoiceId = '',
    prescriptionDate,
  } = data ?? {};
  const {
    draftStockOutLines: draftPrescriptionLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
    updateNotes,
  } = useDraftPrescriptionLines(
    currentItem,
    DateUtils.getDateOrNull(prescriptionDate)
  );
  const {
    save: { saveLines, isSavingLines },
  } = usePrescriptionLines();

  const packSizeController = usePackSizeController(draftPrescriptionLines);
  const { isDirty, setIsDirty } = useDirtyCheck();

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

  useConfirmOnLeaving(isDirty);

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

    await saveLines({ draftPrescriptionLines, patch });

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

  const { hasNext, next, hasPrevious, previous } = usePreviousNextItem(
    items,
    currentItem?.id
  );

  return (
    <>
      <Grid container gap={0.5}>
        <PrescriptionLineEditForm
          disabled={mode === ModalMode.Update || isDisabled}
          packSizeController={packSizeController}
          onChangeItem={(item: ItemRowFragment | null) => {
            if (status === InvoiceNodeStatus.New) setIsDirty(true);
            setIsAutoAllocated(false);
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
      <Footer
        hasNext={hasNext}
        next={next}
        hasPrevious={hasPrevious}
        previous={previous}
        invoiceNumber={data?.invoiceNumber}
        loading={isSavingLines || isLoading}
        isDirty={isDirty}
        handleSave={handleSave}
      />
    </>
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
  const t = useTranslation();

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
    <>
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
    </>
  );
};
