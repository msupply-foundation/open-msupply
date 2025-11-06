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

export const EditWarningWhenMissingRecentStocktakeData = ({
  value,
  update,
  disabled = false,
}: {
  value: WarnWhenMissingRecentStocktakeDataNode;
  update: (
    value: Omit<WarnWhenMissingRecentStocktakeDataNode, '__typename'>
  ) => void;
  disabled?: boolean;
}) => {
  const t = useTranslation();

  // Helper to ensure all required fields have valid values (excluding __typename for input)
  const createUpdateValue = (
    updates: Partial<Omit<WarnWhenMissingRecentStocktakeDataNode, '__typename'>>
  ) => {
    const newValue = {
      enabled: value?.enabled ?? false,
      maxAge: value?.maxAge ?? 0,
      minItems: value?.minItems ?? 0,
      ...updates,
    };
    update(newValue);
  };

  const handleMaxAgeChange = (maxAge?: number | undefined) => {
    createUpdateValue({ maxAge });
  };

  const handleMinItemsChange = (minItems?: number | undefined) => {
    createUpdateValue({ minItems });
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="caption" color="textSecondary">
        {t('preference.warnWhenMissingRecentStocktake.description')}
      </Typography>
      <InputWithLabelRow
        label={t('preference.warnWhenMissingRecentStocktake.enabled')}
        Input={
          <Switch
            disabled={disabled}
            checked={value.enabled}
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
            disabled={disabled || !value.enabled}
            value={value.maxAge}
            onChange={handleMaxAgeChange}
            onBlur={() => {}}
          />
        }
        labelRight
        labelWidth={'100%'}
      />

      <InputWithLabelRow
        label={t('preference.warnWhenMissingRecentStocktake.minItems')}
        Input={
          <NumericTextInput
            disabled={disabled || !value.enabled}
            value={value.minItems}
            onChange={handleMinItemsChange}
            onBlur={() => {}}
          />
        }
        labelRight
        labelWidth={'100%'}
      />
    </Box>
  );
};
