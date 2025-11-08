import React, { useState } from 'react';
import {
  useTranslation,
  InputWithLabelRow,
  ConfirmationModalLayout,
  Grid,
  DialogButton,
  getReasonOptionTypes,
  useAuthContext,
  StoreModeNodeType,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import {
  ReasonOptionRowFragment,
  ReasonOptionsSearchInput,
  useReasonOptions,
} from '@openmsupply-client/system';
import { StocktakeLineFragment, useStocktakeOld } from '../api';

interface ReduceLinesToZeroConfirmationModalProps {
  isOpen: boolean;
  selectedRows: StocktakeLineFragment[];
  onCancel: () => void;
  clearSelected: () => void;
}

export const ReduceLinesToZeroConfirmationModal = ({
  isOpen,
  selectedRows,
  onCancel,
  clearSelected,
}: ReduceLinesToZeroConfirmationModalProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();

  const [reason, setReason] = useState<ReasonOptionRowFragment | null>(null);

  const { onZeroQuantities, allSelectedItemsAreVaccines } =
    useStocktakeOld.line.zeroQuantities(selectedRows);

  const { data: reasonOptions } = useReasonOptions();
  const reasonIsRequired = reasonOptions?.totalCount !== 0;

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
            <ReasonOptionsSearchInput
              type={getReasonOptionTypes({
                isInventoryReduction: true,
                isVaccine: allSelectedItemsAreVaccines,
                isDispensary: store?.storeMode === StoreModeNodeType.Dispensary,
              })}
              fallbackType={ReasonOptionNodeType.NegativeInventoryAdjustment}
              value={reason}
              onChange={reason => setReason(reason)}
              width={160}
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
