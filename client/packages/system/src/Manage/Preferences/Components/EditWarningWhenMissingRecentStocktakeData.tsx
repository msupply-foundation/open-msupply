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

// Backend returns snake_case, but TypeScript types expect camelCase
type WarnWhenMissingRecentStocktakeDataSnakeCase = {
  enabled: boolean;
  max_age?: number;
  min_items?: number;
  maxAge?: number;
  minItems?: number;
};

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

  // The backend returns snake_case (max_age, min_items) but we need to handle both formats
  const getValue = (val: WarnWhenMissingRecentStocktakeDataSnakeCase) => {
    const maxAge = val?.max_age ?? val?.maxAge ?? 0;
    const minItems = val?.min_items ?? val?.minItems ?? 0;
    const enabled = val?.enabled ?? false;

    return { maxAge, minItems, enabled };
  };

  const { maxAge, minItems, enabled } = getValue(
    value as WarnWhenMissingRecentStocktakeDataSnakeCase
  );

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
            disabled={disabled || !enabled}
            value={minItems}
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
