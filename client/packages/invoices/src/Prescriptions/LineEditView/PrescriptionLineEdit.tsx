import React from 'react';
import { useBufferState } from '@openmsupply-client/common';
import { usePrescription } from '../api';
// import { allocateQuantities } from '../api/hooks/utils';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { ItemRowWithDirectionsFragment } from '@openmsupply-client/system';

interface PrescriptionLineEditProps {
  item: ItemRowWithDirectionsFragment | null;
  programId?: string;
  invoiceId: string;
}

export const PrescriptionLineEdit: React.FC<PrescriptionLineEditProps> = ({
  item,
  programId,
  invoiceId,
}) => {
  const isNew = item === null;
  const [currentItem, setCurrentItem] = useBufferState(item);

  const { isDisabled } = usePrescription();

  return (
    <PrescriptionLineEditForm
      disabled={isDisabled}
      isNew={isNew}
      onChangeItem={(item: ItemRowWithDirectionsFragment | null) => {
        // setIsAutoAllocated(false);
        setCurrentItem(item);
      }}
      item={currentItem}
      programId={programId}
      invoiceId={invoiceId}
    />
  );
};
