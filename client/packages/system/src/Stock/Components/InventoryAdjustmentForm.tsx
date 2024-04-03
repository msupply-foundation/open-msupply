import React, { FC } from 'react';
import {
  TextWithLabelRow,
  InputWithLabelRow,
  InputWithLabelRowProps,
  useTranslation,
  useDebounceCallback,
  Box,
  BasicTextInput,
  Autocomplete,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import {
  Adjustment,
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
  onUpdate,
}) => {
  const t = useTranslation('inventory');

  const { asPackVariant } = usePackVariant(
    draft.itemId,
    draft.item.unitName ?? null
  );
  const packUnit = asPackVariant(draft.packSize);

  const debouncedUpdate = useDebounceCallback(
    (patch: Partial<StockLineRowFragment>) => onUpdate(patch),
    [onUpdate],
    500
  );

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
                renderInput={p => (
                  <BasicTextInput
                    {...p}
                    InputProps={{
                      style: { width: 160 },
                      ...p.InputProps,
                    }}
                  />
                )}
                options={[
                  { label: t('label.addition'), value: Adjustment.Addition },
                  { label: t('label.reduction'), value: Adjustment.Reduction },
                ]}
                // value={draft.adjustment}
                // onChange={(_, value) => debouncedUpdate({ adjustment: value })}
              />
            </Box>
          }
        />{' '}
        <StyledInputRow
          label={t('label.reason')}
          Input={
            <Box display="flex" style={{ width: 160 }}>
              <InventoryAdjustmentReasonSearchInput
                width={160}
                onChange={
                  () => {}
                  // reason =>
                  // debouncedUpdate({ barcode: e.target.value })
                }
                value={null}
                adjustment={Adjustment.Addition}
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
            <Box display="flex" style={{ width: 160 }}>
              <BasicTextInput
                defaultValue={draft.barcode ?? ''}
                onChange={e => debouncedUpdate({ barcode: e.target.value })}
              />
            </Box>
          }
        />
        <StyledInputRow
          label={t('label.new-num-packs')}
          Input={
            <Box display="flex" style={{ width: 160 }}>
              <BasicTextInput
                defaultValue={draft.barcode ?? ''}
                onChange={e => debouncedUpdate({ barcode: e.target.value })}
              />
            </Box>
          }
        />
      </Box>
    </Box>
  );
};
