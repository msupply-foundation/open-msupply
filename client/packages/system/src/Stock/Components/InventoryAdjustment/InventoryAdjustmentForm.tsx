import React, { FC } from 'react';
import {
  TextWithLabelRow,
  useTranslation,
  Box,
  NumericTextInput,
  DialogButton,
  useNotification,
} from '@openmsupply-client/common';
import { StockLineRowFragment, useInventoryAdjustment } from '../../api';
import {
  Adjustment,
  InventoryAdjustmentReasonSearchInput,
  usePackVariant,
} from '../../..';
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

  const saveDisabled = !draft.direction || draft.adjustBy === 0;

  const save = async () => {
    try {
      await create();
      const successSnack = success(t('messages.inventory-adjustment-saved'));
      successSnack();
    } catch {
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
            value={draft.direction}
            onChange={direction => {
              if (direction !== undefined) {
                setDraft({
                  direction,
                  reason: null,
                  adjustBy: 0,
                  newNumberOfPacks: stockLine.totalNumberOfPacks,
                });
              }
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
                adjustment={draft.direction}
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
                draft.direction === Adjustment.Reduction
                  ? stockLine.totalNumberOfPacks
                  : undefined
              }
              value={draft.adjustBy}
              onChange={adjustBy =>
                setDraft(state => ({
                  ...state,
                  adjustBy: adjustBy ?? 0,
                  newNumberOfPacks:
                    state.direction === Adjustment.Addition
                      ? stockLine.totalNumberOfPacks + (adjustBy ?? 0)
                      : stockLine.totalNumberOfPacks - (adjustBy ?? 0),
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
              value={draft.newNumberOfPacks}
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
