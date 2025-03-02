import React from 'react';
import { StockAllocationSection } from './StockAllocationSection';
import { InvoiceNodeStatus } from '@common/types';
import { useDraftPrescriptionLines } from './hooks/useDraftPrescriptionLines';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';
import { Footer } from './Footer';
import { useItemPrescriptionLines } from './hooks/useItemPrescriptionLines';

const PrescriptionItemDetailsInner = ({
  initialLines,
  isNew,
  itemDetails,
  disabled,
}: {
  isNew: boolean;
  itemDetails: DraftItem | null;
  initialLines: DraftPrescriptionLine[];
  disabled: boolean;
}) => {
  const { draftLines, updateLineQuantity } =
    useDraftPrescriptionLines(initialLines);

  return (
    <>
      <StockAllocationSection
        itemDetails={itemDetails}
        disabled={disabled}
        isNew={isNew}
        prescriptionLines={draftLines}
        updateLineQuantity={updateLineQuantity}
      />
      {/* // directions */}

      {/* Rendering here, idea is this would go away, autosave anyway */}
      <Footer
        isSaving={false} //TODO
        disabled={true} // TODO
        handleSave={async () => {}} //TODO
      />
    </>
  );
};

interface PrescriptionItemDetailsProps {
  itemId: string;
  prescriptionId: string;
  isNew: boolean;
  status: InvoiceNodeStatus;
  disabled: boolean;
}

export const PrescriptionItemDetails = ({
  itemId,
  prescriptionId,
  isNew,
  status,
  disabled,
}: PrescriptionItemDetailsProps) => {
  const { itemDetails, initialDraftLines, isLoading } =
    useItemPrescriptionLines({
      itemId,
      prescriptionId,
      status,
    });

  if (isLoading) {
    return null;
  }
  return (
    <PrescriptionItemDetailsInner
      key={itemId + '_details'} // resets state when item changes
      itemDetails={itemDetails ?? null}
      disabled={disabled}
      isNew={isNew}
      initialLines={initialDraftLines}
    />
  );
};
