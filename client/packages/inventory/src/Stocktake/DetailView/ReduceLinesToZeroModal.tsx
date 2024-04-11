import React, { useState } from 'react';
import {
  Grid,
  useTranslation,
  BasicModal,
  DialogButton,
  Typography,
  InfoIcon,
  LoadingButton,
  InputWithLabelRow,
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
    <BasicModal width={400} height={200} open={isOpen}>
      <Grid container gap={1} flex={1} padding={4} flexDirection="column">
        <Grid container gap={1} flexDirection="row">
          <Grid item>
            <InfoIcon color="secondary" />
          </Grid>
          <Grid item>
            <Typography variant="h6">{t('heading.are-you-sure')}</Typography>
          </Grid>
        </Grid>
        <Grid item>
          <Typography style={{ whiteSpace: 'pre-line' }}>
            {t('messages.confirm-reduce-lines-to-zero')}
          </Typography>
        </Grid>
        {reasonIsRequired && (
          <Grid item margin={2}>
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
          </Grid>
        )}
        <Grid
          container
          gap={1}
          flexDirection="row"
          alignItems="flex-end"
          justifyContent="center"
          flex={1}
          display="flex"
          marginTop={2}
        >
          <Grid item>
            <DialogButton variant="cancel" onClick={onCancel} />
          </Grid>
          <Grid item>
            <LoadingButton
              autoFocus
              disabled={reasonIsRequired && !reason}
              color="secondary"
              isLoading={false} // todo
              onClick={async () => {
                await onZeroQuantities(reason);
                onCancel();
              }}
            >
              {t('button.ok')}
            </LoadingButton>
          </Grid>
        </Grid>
      </Grid>
    </BasicModal>
  );
};
