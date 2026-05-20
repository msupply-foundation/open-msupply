import React from 'react';
import {
  BasicTextInput,
  Box,
  Checkbox,
  Grid,
  PropertyV2ParentTableEnum,
  PropertyV2TypeEnum,
  Select,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftProperty } from './useDraftProperty';
import { PropertyInputRow, PROPERTY_INPUT_WIDTH } from './StyledInputRow';

interface PropertyFormProps {
  draft: DraftProperty;
  update: (patch: Partial<DraftProperty>) => void;
  toggleAttachedTable: (table: PropertyV2ParentTableEnum) => void;
}

const TABLE_OPTIONS: PropertyV2ParentTableEnum[] = [
  PropertyV2ParentTableEnum.Name,
  PropertyV2ParentTableEnum.Item,
  PropertyV2ParentTableEnum.InvoiceLine,
];

const TYPE_OPTIONS: PropertyV2TypeEnum[] = [
  PropertyV2TypeEnum.Text,
  PropertyV2TypeEnum.Number,
  PropertyV2TypeEnum.Real,
  PropertyV2TypeEnum.Date,
  PropertyV2TypeEnum.Option,
];

export const PropertyForm = ({
  draft,
  update,
  toggleAttachedTable,
}: PropertyFormProps) => {
  const t = useTranslation();

  return (
    <Grid container flexDirection="column" gap={1}>
      <PropertyInputRow
        label={t('label.name')}
        Input={
          <BasicTextInput
            autoFocus
            value={draft.name}
            onChange={e => update({ name: e.target.value })}
            sx={{ width: PROPERTY_INPUT_WIDTH }}
          />
        }
      />
      <PropertyInputRow
        label={t('label.property-type')}
        Input={
          <Select
            value={draft.type}
            onChange={e =>
              update({ type: e.target.value as PropertyV2TypeEnum })
            }
            options={TYPE_OPTIONS.map(t => ({ label: t, value: t }))}
            sx={{ width: PROPERTY_INPUT_WIDTH }}
          />
        }
      />
      <PropertyInputRow
        label={t('label.property-translation-key')}
        Input={
          <BasicTextInput
            value={draft.translationKey ?? ''}
            onChange={e =>
              update({ translationKey: e.target.value || null })
            }
            sx={{ width: PROPERTY_INPUT_WIDTH }}
          />
        }
      />
      <PropertyInputRow
        label={t('label.property-attached-tables')}
        Input={
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            {TABLE_OPTIONS.map(table => (
              // Single click target — the Checkbox itself owns the toggle so
              // clicking the box directly works. The label is wrapped in the
              // same component so clicking the text also toggles. We don't
              // attach onClick to the wrapper or we'd get a double-fire
              // (bubble + change event both invoking toggle).
              <Box
                key={table}
                component="label"
                display="flex"
                alignItems="center"
                gap={0.25}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <Checkbox
                  checked={draft.attachedTables.includes(table)}
                  onChange={() => toggleAttachedTable(table)}
                />
                <Typography variant="body2">{table}</Typography>
              </Box>
            ))}
          </Box>
        }
      />
    </Grid>
  );
};
