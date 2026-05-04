import React from 'react';
import {
  Box,
  NumericTextInput,
  Switch,
  BackdatingNode,
  useTranslation,
} from '@openmsupply-client/common';
import { PreferenceLabelRow } from '../EditPage/PreferenceLabelRow';

export const EditBackdating = ({
  value,
  update,
  disabled = false,
}: {
  value: BackdatingNode;
  update: (value: Omit<BackdatingNode, '__typename'>) => void;
  disabled?: boolean;
}) => {
  const t = useTranslation();

  const createUpdateValue = (
    updates: Partial<Omit<BackdatingNode, '__typename'>>
  ) => {
    update({
      shipmentsEnabled: value.shipmentsEnabled,
      inventoryAdjustmentsEnabled: value.inventoryAdjustmentsEnabled,
      maxDays: value.maxDays,
      ...updates,
    });
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <PreferenceLabelRow
        label={t('preference.allowBackdatingOfShipments')}
        Input={
          <Switch
            disabled={disabled}
            checked={value.shipmentsEnabled}
            onChange={(_, checked) =>
              createUpdateValue({ shipmentsEnabled: checked })
            }
          />
        }
      />

      <PreferenceLabelRow
        label={t('preference.allowBackdatingOfInventoryAdjustments')}
        Input={
          <Switch
            disabled={disabled}
            checked={value.inventoryAdjustmentsEnabled}
            onChange={(_, checked) =>
              createUpdateValue({ inventoryAdjustmentsEnabled: checked })
            }
          />
        }
      />

      <PreferenceLabelRow
        label={t('preference.maximumBackdatingDays')}
        Input={
          <NumericTextInput
            disabled={disabled || (!value.shipmentsEnabled && !value.inventoryAdjustmentsEnabled)}
            value={value.maxDays}
            onChange={newMaxDays =>
              createUpdateValue({ maxDays: newMaxDays ?? 0 })
            }
          />
        }
        isLast={true}
      />
    </Box>
  );
};
