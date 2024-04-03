import React, { FC, useState } from 'react';
import {
  TextWithLabelRow,
  InputWithLabelRow,
  InputWithLabelRowProps,
  useTranslation,
  Box,
  Autocomplete,
  NumericTextInput,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import {
  Adjustment,
  InventoryAdjustmentReasonRowFragment,
  InventoryAdjustmentReasonSearchInput,
  usePackVariant,
} from '../..';

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
interface InventoryAdjustmentFormProps {
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
}
export const InventoryAdjustmentForm: FC<InventoryAdjustmentFormProps> = ({
  draft,
  // onUpdate,
}) => {
  const t = useTranslation('inventory');

  const [direction, setDirection] = useState<Adjustment>(Adjustment.None);
  const [state, setState] = useState<{
    reason: InventoryAdjustmentReasonRowFragment | null;
    adjustBy: number;
    newNumPacks: number;
  }>({
    reason: null,
    adjustBy: 0,
    newNumPacks: draft.totalNumberOfPacks,
  });

  const { asPackVariant } = usePackVariant(
    draft.itemId,
    draft.item.unitName ?? null
  );
  const packUnit = asPackVariant(draft.packSize);

  const options = [
    { label: t('label.addition'), value: Adjustment.Addition },
    { label: t('label.reduction'), value: Adjustment.Reduction },
  ];

  return (
    <Box display="flex">
      <Box display="flex" flexDirection="column" padding={2} gap={1} flex={1}>
        <TextWithLabelRow
          label={t('label.pack')}
          text={String(packUnit)}
          textProps={{ textAlign: 'end' }}
        />
        <StyledInputRow
          label={t('label.direction')}
          Input={
            <Autocomplete
              options={options}
              clearable={false}
              value={options.find(option => option.value === direction) ?? null}
              onChange={(_, direction) => {
                if (direction) {
                  setDirection(direction.value);
                  setState(state => ({
                    ...state,
                    reason: null,
                    newNumPacks: draft.totalNumberOfPacks,
                    adjustBy: 0,
                  }));
                }
              }}
            />
          }
        />
        <StyledInputRow
          label={t('label.reason')}
          Input={
            <Box display="flex" width={160}>
              <InventoryAdjustmentReasonSearchInput
                onChange={reason => setState(state => ({ ...state, reason }))}
                value={state.reason}
                adjustment={direction}
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
          text={String(draft.totalNumberOfPacks)}
          textProps={{ textAlign: 'end' }}
          labelProps={{ sx: { textWrap: 'wrap' } }}
        />
        <StyledInputRow
          label={t('label.adjust-by')}
          Input={
            <NumericTextInput
              disabled={direction === Adjustment.None}
              width={160}
              max={
                direction === Adjustment.Reduction
                  ? draft.totalNumberOfPacks
                  : undefined
              }
              value={state.adjustBy}
              onChange={adjustBy =>
                setState(state => ({
                  ...state,
                  adjustBy: adjustBy ?? 0,
                  newNumPacks:
                    direction === Adjustment.Addition
                      ? draft.totalNumberOfPacks + (adjustBy ?? 0)
                      : draft.totalNumberOfPacks - (adjustBy ?? 0),
                }))
              }
            />
          }
        />
        <StyledInputRow
          label={t('label.new-num-packs')}
          Input={
            <NumericTextInput
              disabled={direction === Adjustment.None}
              width={160}
              value={state.newNumPacks}
              max={
                direction === Adjustment.Reduction
                  ? draft.totalNumberOfPacks
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
                setState(state => ({
                  ...state,
                  newNumPacks: newNumPacks ?? 0,
                  adjustBy: Math.abs(
                    draft.totalNumberOfPacks - (newNumPacks ?? 0)
                  ),
                }))
              }
            />
          }
        />
      </Box>
    </Box>
  );
};
