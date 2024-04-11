import React, { useState } from 'react';
import {
  useTranslation,
  InputWithLabelRow,
  ConfirmationWithChildrenModal,
} from '@openmsupply-client/common';
import {
  Adjustment,
  InventoryAdjustmentReasonRowFragment,
  InventoryAdjustmentReasonSearchInput,
  useInventoryAdjustmentReason,
} from '@openmsupply-client/system';
import { useStocktake } from '../api';

interface ReduceLinesToZeroConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
}

export const ReduceLinesToZeroConfirmationModal = ({
  isOpen,
  onCancel,
}: ReduceLinesToZeroConfirmationModalProps) => {
  const t = useTranslation('inventory');

  const [reason, setReason] =
    useState<InventoryAdjustmentReasonRowFragment | null>(null);

  const onZeroQuantities = useStocktake.line.zeroQuantities();

  const { data } = useInventoryAdjustmentReason.document.listAllActive();
  const reasonIsRequired = data?.totalCount !== 0;

  return (
    <ConfirmationWithChildrenModal
      isOpen={isOpen}
      title={t('heading.are-you-sure')}
      message={t('messages.confirm-reduce-lines-to-zero')}
      onClose={onCancel}
      onSave={() => onZeroQuantities(reason)}
      canSave={reasonIsRequired && !reason}
    >
      {reasonIsRequired && (
        <InputWithLabelRow
          label={t('label.reason')}
          labelWidth="100px"
          Input={
            <InventoryAdjustmentReasonSearchInput
              adjustment={Adjustment.Reduction}
              value={reason}
              onChange={reason => setReason(reason)}
            />
          }
          sx={{
            '.MuiFormControl-root > .MuiInput-root, > input': {
              width: '160px',
            },
          }}
        />
      )}
    </ConfirmationWithChildrenModal>
  );
};
