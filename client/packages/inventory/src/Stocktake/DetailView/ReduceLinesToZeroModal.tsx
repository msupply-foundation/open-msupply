import React, { useState } from 'react';
import {
  useTranslation,
  InputWithLabelRow,
  ConfirmationModalLayout,
  Grid,
  DialogButton,
  AdjustmentTypeInput,
} from '@openmsupply-client/common';
import {
  InventoryAdjustmentReasonRowFragment,
  InventoryAdjustmentReasonSearchInput,
  useInventoryAdjustmentReasonList,
} from '@openmsupply-client/system';
import { useStocktakeOld } from '../api';

interface ReduceLinesToZeroConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  clearSelected: () => void;
}

export const ReduceLinesToZeroConfirmationModal = ({
  isOpen,
  onCancel,
  clearSelected,
}: ReduceLinesToZeroConfirmationModalProps) => {
  const t = useTranslation();

  const [reason, setReason] =
    useState<InventoryAdjustmentReasonRowFragment | null>(null);

  const onZeroQuantities = useStocktakeOld.line.zeroQuantities();

  const { data } = useInventoryAdjustmentReasonList();
  const reasonIsRequired = data?.totalCount !== 0;

  return (
    <ConfirmationModalLayout
      isOpen={isOpen}
      title={t('heading.are-you-sure')}
      message={t('messages.confirm-reduce-lines-to-zero')}
      buttons={
        <>
          <Grid>
            <DialogButton variant="cancel" onClick={onCancel} />
          </Grid>
          <Grid>
            <DialogButton
              variant="ok"
              disabled={reasonIsRequired && !reason}
              onClick={async () => {
                await onZeroQuantities(reason);
                clearSelected();
                onCancel();
              }}
            />
          </Grid>
        </>
      }
    >
      {reasonIsRequired && (
        <InputWithLabelRow
          label={t('label.reason')}
          labelWidth="100px"
          Input={
            <InventoryAdjustmentReasonSearchInput
              adjustmentType={AdjustmentTypeInput.Reduction}
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
    </ConfirmationModalLayout>
  );
};
