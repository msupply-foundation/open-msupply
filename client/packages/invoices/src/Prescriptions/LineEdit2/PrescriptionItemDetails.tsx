import React from 'react';
import { StockAllocationSection } from './StockAllocationSection';
import { InvoiceNodeStatus } from '@common/types';
import { useDraftPrescriptionLines } from './hooks/useDraftPrescriptionLines';
import { DraftPrescriptionLine } from '../../types';
import { DraftItem } from '../..';
import { Footer } from './Footer';
import { useItemPrescriptionLines } from './hooks/useItemPrescriptionLines';
import { useSaveLines } from '../api';

const PrescriptionItemDetailsInner = ({
  initialLines,
  isNew,
  itemDetails,
  disabled,
  prescriptionId,
  status,
}: {
  isNew: boolean;
  prescriptionId: string;
  itemDetails: DraftItem | null;
  initialLines: DraftPrescriptionLine[];
  disabled: boolean;
  status: InvoiceNodeStatus;
}) => {
  const { draftLines, updateLineQuantity, allocateQuantity } =
    useDraftPrescriptionLines(initialLines, status);

  const { mutateAsync: onSave, isLoading } = useSaveLines(
    prescriptionId,
    0 /*TODO */
  );

  const handleSave = async () => {
    // tODO; if new, go to picked
    await onSave({
      draftPrescriptionLines: draftLines,
    });
  };

  return (
    <>
      <StockAllocationSection
        itemDetails={itemDetails}
        disabled={disabled}
        isNew={isNew}
        prescriptionLines={draftLines}
        updateLineQuantity={updateLineQuantity}
        allocateQuantity={allocateQuantity}
      />
      {/* // directions */}

      {/* Rendering here, idea is this would go away, autosave anyway */}
      <Footer
        isSaving={isLoading}
        disabled={disabled} // TODO dirty/complete
        handleSave={handleSave}
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
      prescriptionId={prescriptionId}
      status={status}
    />
  );
};
