import React from 'react';
import { StockAllocationSection } from './StockAllocationSection';
import { InvoiceNodeStatus } from '@common/types';
import { useDraftPrescriptionLines } from './hooks/useDraftPrescriptionLines';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';

const PrescriptionItemDetailsInner = ({
  itemId,
  initialDraftLines,
  isNew,
  itemDetails,
  disabled,
}: {
  itemId: string;
  isNew: boolean;
  itemDetails: DraftItem | null;
  initialDraftLines: DraftPrescriptionLine[];
  disabled: boolean;
}) => {
  return (
    <>
      <StockAllocationSection
        itemId={itemId}
        itemDetails={itemDetails}
        disabled={disabled}
        isNew={isNew}
        prescriptionLines={initialDraftLines}
      />
      {/* // directions */}
    </>
  );
};

interface PrescriptionItemDetailsProps {
  itemId: string;
  prescriptionId: string;
  isNew: boolean;
  status: InvoiceNodeStatus;
}

export const PrescriptionItemDetails = ({
  itemId,
  prescriptionId,
  isNew,
  status,
}: PrescriptionItemDetailsProps) => {
  const { itemDetails, initialDraftLines, isLoading } =
    useDraftPrescriptionLines({
      itemId,
      prescriptionId,
      status,
    });

  if (isLoading) {
    return null;
  }
  return (
    <>
      <PrescriptionItemDetailsInner
        itemId={itemId}
        itemDetails={itemDetails ?? null}
        disabled={false}
        isNew={isNew}
        initialDraftLines={initialDraftLines}
      />
      {/* // directions */}
    </>
  );
};
