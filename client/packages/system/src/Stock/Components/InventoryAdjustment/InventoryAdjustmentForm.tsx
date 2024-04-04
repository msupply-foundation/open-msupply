import React, { FC } from 'react';
import {
  TextWithLabelRow,
  InputWithLabelRow,
  InputWithLabelRowProps,
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
    // TODO: handle error if no reason selected when reasons required
    await create();
    const successSnack = success(t('messages.inventory-adjustment-saved'));
    successSnack();
  };

  return (
    <Box display="flex">
      <Box display="flex" flexDirection="column" padding={2} gap={1} flex={1}>
        <TextWithLabelRow
          label={t('label.pack')}
          text={packUnit}
          textProps={{ textAlign: 'end' }}
        />
        <StyledInputRow
          label={t('label.direction')}
          Input={
            <Box display="flex" width={160}>
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
          }
        />
        <StyledInputRow
          label={t('label.reason')}
          Input={
            <Box display="flex" width={160}>
              <InventoryAdjustmentReasonSearchInput
                onChange={reason => setDraft(state => ({ ...state, reason }))}
                value={draft.reason}
                adjustment={draft.direction}
              />
            </Box>
          }
        />
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        gap={1}
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
              disabled={!draft.direction}
              width={160}
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
          label={t('label.new-num-packs')}
          Input={
            <NumericTextInput
              disabled={!draft.direction}
              width={160}
              value={draft.newNumberOfPacks}
              max={
                draft.direction === Adjustment.Reduction
                  ? stockLine.totalNumberOfPacks
                  : undefined
              }
              // // TODO: minimum new # packs when in addition mode
              // // `min` field doesn't really work... e.g. if current/min is 5,
              // // user wants to type 20, so starts by typing 2, it will be reset to 5!
              // // I want a debounced min field or something lol
              // // maybe error state? (disable ok? or show error message)
              // // reset to min on lose focus?
              // min={
              //   direction === Adjustment.Addition
              //     ? draft.totalNumberOfPacks
              //     : undefined
              // }
              onChange={newNumPacks =>
                setDraft(state => ({
                  ...state,
                  newNumberOfPacks: newNumPacks ?? 0,
                  adjustBy: Math.abs(
                    stockLine.totalNumberOfPacks - (newNumPacks ?? 0)
                  ),
                }))
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

const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end' } }}
    labelWidth="100px"
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: '160px',
        width: '160px',
      },
    }}
  />
);
