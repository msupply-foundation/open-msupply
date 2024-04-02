import React, { FC } from 'react';
import {
  Grid,
  TextWithLabelRow,
  InputWithLabelRow,
  InputWithLabelRowProps,
  useTranslation,
  useDebounceCallback,
  Box,
  BasicTextInput,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { usePackVariant } from '../..';

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
    <Grid
      display="flex"
      flex={1}
      container
      paddingTop={2}
      paddingBottom={2}
      width="100%"
    >
      <Grid
        container
        display="flex"
        flex={1}
        flexBasis="50%"
        flexDirection="column"
        gap={1}
      >
        <TextWithLabelRow
          label={t('label.num-packs')}
          text={String(draft.totalNumberOfPacks)}
          textProps={{ textAlign: 'end' }}
        />
      </Grid>
      <Grid
        container
        display="flex"
        flex={1}
        flexBasis="50%"
        flexDirection="column"
        gap={1}
      >
        <StyledInputRow
          label={t('label.barcode')}
          Input={
            <Box display="flex" style={{ width: 162 }}>
              <BasicTextInput
                defaultValue={draft.barcode ?? ''}
                onChange={e => debouncedUpdate({ barcode: e.target.value })}
              />
            </Box>
          }
        />
        <TextWithLabelRow
          label={t('label.pack')}
          text={String(packUnit)}
          textProps={{ textAlign: 'end' }}
        />
      </Grid>
    </Grid>
  );
};
