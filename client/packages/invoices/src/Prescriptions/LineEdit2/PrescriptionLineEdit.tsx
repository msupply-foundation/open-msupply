import React, { useState } from 'react';
import {
  useBufferState,
  InvoiceNodeStatus,
  DateUtils,
} from '@openmsupply-client/common';
import { useDraftPrescriptionLines } from './hooks';
import { usePrescription } from '../api';
import {
  getAllocatedQuantity,
  sumAvailableQuantity,
  usePackSizeController,
} from '../../StockOut';
import { allocateQuantities } from '../api/hooks/utils';
import { DraftPrescriptionLine } from '../../types';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { ItemRowWithDirectionsFragment } from '@openmsupply-client/system';

interface PrescriptionLineEditProps {
  item: ItemRowWithDirectionsFragment | null;
  draftLines?: DraftPrescriptionLine[];
  updateLines?: (lines: DraftPrescriptionLine[]) => void;
  setIsDirty: (dirty: boolean) => void;
  programId?: string;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditProps> = ({
  item,
  draftLines: draftPrescriptionLines = [],
  updateLines = () => {},
  setIsDirty,
  programId,
}) => {
  const isNew = item === null;
  const [currentItem, setCurrentItem] = useBufferState(item);
  const [isAutoAllocated, setIsAutoAllocated] = useState(false);
  const [showZeroQuantityConfirmation, setShowZeroQuantityConfirmation] =
    useState(false);
  const {
    query: { data },
    isDisabled,
  } = usePrescription();
  const { status = InvoiceNodeStatus.New, prescriptionDate } = data ?? {};
  const { isLoading, updateQuantity, updateNotes } = useDraftPrescriptionLines(
    currentItem,
    draftPrescriptionLines,
    updateLines,
    DateUtils.getDateOrNull(prescriptionDate)
  );

  const packSizeController = usePackSizeController(draftPrescriptionLines);

  const onUpdateQuantity = (batchId: string, packs: number) => {
    updateQuantity(batchId, packs);
    setIsAutoAllocated(false);
    setIsDirty(true);
  };

  const onUpdateNotes = (note: string) => {
    updateNotes(note);
    setIsAutoAllocated(false);
    setIsDirty(true);
  };

  const onAllocate = (
    numPacks: number,
    packSize: number | null,
    autoAllocated = false,
    prescribedQuantity: number | null
  ) => {
    const newAllocateQuantities = allocateQuantities(
      status,
      draftPrescriptionLines
    )(numPacks, packSize, true, prescribedQuantity);

    // Don't make saveable (isDirty) if item is new and has no auto-allocatable
    // stock
    if (!(!item && newAllocateQuantities?.every(el => el.numberOfPacks === 0)))
      setIsDirty(true);
    updateLines(newAllocateQuantities ?? draftPrescriptionLines);
    setIsAutoAllocated(autoAllocated);
    if (showZeroQuantityConfirmation && numPacks !== 0)
      setShowZeroQuantityConfirmation(false);

    return newAllocateQuantities;
  };

  const canAutoAllocate = !!(currentItem && draftPrescriptionLines.length);

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
    <PrescriptionLineEditForm
      disabled={isDisabled}
      isNew={isNew}
      packSizeController={packSizeController}
      onChangeItem={(item: ItemRowWithDirectionsFragment | null) => {
        setIsAutoAllocated(false);
        setCurrentItem(item);
      }}
      item={currentItem}
      allocatedUnits={getAllocatedQuantity(draftPrescriptionLines)}
      availableUnits={sumAvailableQuantity(draftPrescriptionLines)}
      onChangeQuantity={onAllocate}
      canAutoAllocate={canAutoAllocate}
      isAutoAllocated={isAutoAllocated}
      updateNotes={onUpdateNotes}
      draftPrescriptionLines={draftPrescriptionLines}
      showZeroQuantityConfirmation={showZeroQuantityConfirmation}
      hasOnHold={hasOnHold}
      hasExpired={hasExpired}
      isLoading={isLoading}
      updateQuantity={onUpdateQuantity}
      programId={programId}
    />
  );
};
