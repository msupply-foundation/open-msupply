import React from 'react';
import { StockAllocationSection } from './StockAllocationSection';
import { InvoiceNodeStatus } from '@common/types';
import { useDraftPrescriptionLines } from './hooks/useDraftPrescriptionLines';
import { DraftPrescriptionLine } from '../../types';
import { Footer } from './Footer';
import { useItemPrescriptionLines } from './hooks/useItemPrescriptionLines';
import { useSaveLines } from '../api';
import { DirectionsSection } from './DirectionsSection';
import { PrescriptionItem } from '../api/hooks/usePrescriptionLinesByItem';

const PrescriptionItemDetailsInner = ({
  initialLines,
  isNew,
  itemDetails,
  disabled,
  prescriptionId,
  status,
  itemId,
}: {
  isNew: boolean;
  prescriptionId: string;
  itemDetails: PrescriptionItem | null;
  initialLines: DraftPrescriptionLine[];
  disabled: boolean;
  status: InvoiceNodeStatus;
  itemId: string;
}) => {
  const { draftLines, updateLineQuantity, allocateQuantity, updateNote } =
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
      <DirectionsSection
        isNew={isNew}
        disabled={disabled}
        itemId={itemId}
        prescriptionLines={draftLines}
        updateNote={updateNote}
        itemDirections={itemDetails?.itemDirections ?? []}
      />

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
      itemId={itemId}
    />
  );
};
