import React, { FC } from 'react';
import {
  TextWithLabelRow,
  useTranslation,
  Box,
  NumericTextInput,
  DialogButton,
  useNotification,
  AdjustmentTypeInput,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useInventoryAdjustment } from '../../api';
import { InventoryAdjustmentReasonSearchInput, usePackVariant } from '../../..';
import { InventoryAdjustmentDirectionInput } from './InventoryAdjustmentDirectionSearchInput';
import { INPUT_WIDTH, StyledInputRow } from '../StyledInputRow';

interface InventoryAdjustmentFormProps {
  stockLine: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
}
export const InventoryAdjustmentForm: FC<InventoryAdjustmentFormProps> = ({
  stockLine,
}) => {
  const t = useTranslation('inventory');
  const { success } = useNotification();

  const { draft, setDraft, create } = useInventoryAdjustment(stockLine);

  const { asPackVariant } = usePackVariant(
    stockLine.itemId,
    stockLine.item.unitName ?? null
  );
  const packUnit = asPackVariant(stockLine.packSize);

  const saveDisabled = draft.adjustment === 0;

  const save = async () => {
    try {
      await create();
      const successSnack = success(t('messages.inventory-adjustment-saved'));
      successSnack();
    } catch {
      // console.log('OOPS');
      // TODO: handle error if no reason selected when reasons required
    }
  };

  return (
    <Box display="flex">
      <Box display="flex" flexDirection="column" padding={2} gap={2} flex={1}>
        <TextWithLabelRow
          label={t('label.pack')}
          text={packUnit}
          textProps={{ textAlign: 'end' }}
        />
        <Box display="flex" justifyContent={'end'}>
          <InventoryAdjustmentDirectionInput
            value={draft.adjustmentType}
            onChange={adjustmentType => {
              setDraft({
                adjustmentType,
                reason: null,
                adjustment: 0,
              });
            }}
          />
        </Box>

        <StyledInputRow
          label={t('label.reason')}
          Input={
            <Box display="flex" width={INPUT_WIDTH}>
              <InventoryAdjustmentReasonSearchInput
                onChange={reason => setDraft(state => ({ ...state, reason }))}
                value={draft.reason}
                adjustmentType={draft.adjustmentType}
                width={INPUT_WIDTH}
              />
            </Box>
          }
        />
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        gap={2}
        paddingTop={2}
        flex={1}
      >
        <TextWithLabelRow
          label={t('label.num-packs')}
          text={String(stockLine.totalNumberOfPacks)}
          textProps={{ textAlign: 'end' }}
          labelProps={{ sx: { textWrap: 'wrap' } }}
        />
        <StyledInputRow
          label={t('label.adjust-by')}
          Input={
            <NumericTextInput
              width={INPUT_WIDTH}
              max={
                draft.adjustmentType === AdjustmentTypeInput.Reduction
                  ? stockLine.totalNumberOfPacks
                  : undefined
              }
              value={draft.adjustment}
              onChange={value =>
                setDraft(state => ({
                  ...state,
                  adjustment: value ?? 0,
                  adjustmentType: state.adjustmentType,
                  // newNumberOfPacks:
                  //   state.adjustmentType === AdjustmentTypeInput.Addition
                  //     ? stockLine.totalNumberOfPacks + (adjustBy ?? 0)
                  //     : stockLine.totalNumberOfPacks - (adjustBy ?? 0),
                }))
              }
            />
          }
        />
        <StyledInputRow
          label={t('label.new-pack-qty')}
          Input={
            <NumericTextInput
              width={INPUT_WIDTH}
              disabled={true}
              value={
                stockLine.totalNumberOfPacks +
                (draft.adjustmentType === AdjustmentTypeInput.Addition
                  ? draft.adjustment
                  : -draft.adjustment)
              }
            />
          }
        />
        <Box sx={{ display: 'flex', justifyContent: 'end', marginTop: '14px' }}>
          <DialogButton
            variant="save"
            color="primary"
            disabled={saveDisabled}
            onClick={save}
          />
        </Box>
      </Box>
    </Box>
  );
};
