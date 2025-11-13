import React from 'react';
import {
  Box,
  Typography,
  NumericTextInput,
  Switch,
  WarnWhenMissingRecentStocktakeDataNode,
  InputWithLabelRow,
  useTranslation,
} from '@openmsupply-client/common';
import { PreferenceAccordion } from '../EditPage/PreferenceAccordion';

export const EditWarningWhenMissingRecentStocktakeData = ({
  value,
  update,
  disabled = false,
  label,
  sx,
}: {
  value: WarnWhenMissingRecentStocktakeDataNode;
  update: (
    value: Omit<WarnWhenMissingRecentStocktakeDataNode, '__typename'>
  ) => void;
  disabled?: boolean;
  label?: string;
  sx?: Record<string, unknown>;
}) => {
  const t = useTranslation();

  // Set sensible defaults if value is undefined
  const getValueOrDefault = (val: WarnWhenMissingRecentStocktakeDataNode) => {
    const maxAge = val?.maxAge ?? 0;
    const minItems = val?.minItems ?? 0;
    const enabled = val?.enabled ?? false;

    return { maxAge, minItems, enabled };
  };

  const { maxAge, minItems, enabled } = getValueOrDefault(value);

  // Helper to ensure all required fields have valid values (excluding __typename for input)
  const createUpdateValue = (
    updates: Partial<Omit<WarnWhenMissingRecentStocktakeDataNode, '__typename'>>
  ) => {
    const newValue = {
      enabled,
      maxAge,
      minItems,
      ...updates,
    };
    update(newValue);
  };

  const handleMaxAgeChange = (newMaxAge?: number | undefined) => {
    createUpdateValue({ maxAge: newMaxAge });
  };

  const handleMinItemsChange = (newMinItems?: number | undefined) => {
    createUpdateValue({ minItems: newMinItems });
  };

  return (
    <PreferenceAccordion
      label={label ?? t('preference.warnWhenMissingRecentStocktake')}
      sx={sx}
    >
      <Box display="flex" flexDirection="column" gap={2}>
        <Typography variant="caption" color="textSecondary">
          {t('preference.warnWhenMissingRecentStocktake.description')}
        </Typography>
        <InputWithLabelRow
          label={t('preference.warnWhenMissingRecentStocktake.enabled')}
          Input={
            <Switch
              disabled={disabled}
              checked={enabled}
              onChange={(_, checked) => createUpdateValue({ enabled: checked })}
            />
          }
          labelRight
          labelWidth={'100%'}
        />

        <InputWithLabelRow
          label={t('preference.warnWhenMissingRecentStocktake.maxAge')}
          Input={
            <NumericTextInput
              disabled={disabled || !enabled}
              value={maxAge}
              onChange={handleMaxAgeChange}
            />
          }
          labelRight
          labelWidth={'100%'}
        />

        <InputWithLabelRow
          label={t('preference.warnWhenMissingRecentStocktake.minItems')}
          Input={
            <NumericTextInput
              disabled={disabled || !enabled}
              value={minItems}
              onChange={handleMinItemsChange}
            />
          }
          labelRight
          labelWidth={'100%'}
        />
      </Box>
    </PreferenceAccordion>
  );
};
