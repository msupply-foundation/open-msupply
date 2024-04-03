import React, { FC, useState } from 'react';
import {
  TextWithLabelRow,
  InputWithLabelRow,
  InputWithLabelRowProps,
  useTranslation,
  // useDebounceCallback,
  Box,
  BasicTextInput,
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

  // const debouncedUpdate = useDebounceCallback(
  //   (patch: Partial<StockLineRowFragment>) => onUpdate(patch),
  //   [onUpdate],
  //   500
  // );

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
            <Box display="flex" style={{ width: 160 }}>
              <Autocomplete
                options={options}
                clearable={false}
                renderInput={p => (
                  <BasicTextInput
                    {...p}
                    InputProps={{
                      style: { width: 160 },
                      ...p.InputProps,
                    }}
                  />
                )}
                value={
                  options.find(option => option.value === direction) ?? null
                }
                // TODO: on change, update new num packs, adjust by to max
                onChange={(_, direction) =>
                  direction && setDirection(direction.value)
                }
              />
            </Box>
          }
        />
        <StyledInputRow
          label={t('label.reason')}
          Input={
            <Box display="flex" style={{ width: 160 }}>
              <InventoryAdjustmentReasonSearchInput
                width={160}
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
            // TODO max based on direction!
            <NumericTextInput
              disabled={direction === Adjustment.None}
              width={160}
              value={state.newNumPacks}
              // TODO: is this weird UX? instead have it change the direction??
              // LOL NOT THIS - maybe error state! (disable ok? or show error message)
              // reset to max on lose focus?
              max={
                direction === Adjustment.Reduction
                  ? draft.totalNumberOfPacks
                  : undefined
              }
              min={
                direction === Adjustment.Addition
                  ? draft.totalNumberOfPacks
                  : undefined
              }
              onChange={newNumPacks =>
                // tODO: onchange, udpate adjustby
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
