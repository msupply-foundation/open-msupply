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

  const enabled = value?.enabled ?? false;
  const maxDays = value?.maxDays ?? 0;

  const createUpdateValue = (
    updates: Partial<Omit<BackdatingNode, '__typename'>>
  ) => {
    update({
      enabled,
      maxDays,
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
            checked={enabled}
            onChange={(_, checked) => createUpdateValue({ enabled: checked })}
          />
        }
      />

      <PreferenceLabelRow
        label={t('preference.maximumBackdatingDays')}
        Input={
          <NumericTextInput
            disabled={disabled || !enabled}
            value={maxDays}
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
