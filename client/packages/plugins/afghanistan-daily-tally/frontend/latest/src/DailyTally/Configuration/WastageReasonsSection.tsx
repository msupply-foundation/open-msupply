import React from 'react';
import {
  ReasonOptionNodeType,
  Select,
  Stack,
  Typography,
} from '@openmsupply-client/common';
import { usePluginTranslation } from '../../locales';
import { WastageReasons } from '../types';
import { useReasonOptions } from './api/useReasonOptions';

interface Props {
  value: WastageReasons;
  onChange: (next: WastageReasons) => void;
}

export const WastageReasonsSection: React.FC<Props> = ({ value, onChange }) => {
  const t = usePluginTranslation();
  const { options: openVialOptions, isLoading: isOpenVialLoading } =
    useReasonOptions(ReasonOptionNodeType.OpenVialWastage);
  const { options: negativeOptions, isLoading: isNegativeLoading } =
    useReasonOptions(ReasonOptionNodeType.NegativeInventoryAdjustment);

  const buildSelectOptions = (options: { id: string; reason: string }[]) => [
    { label: t('config.wastage.select-reason'), value: '' },
    ...options.map(o => ({ label: o.reason, value: o.id })),
  ];

  // A saved id that isn't among this type's active reasons — a deactivated
  // reason, or (as bad config data can do) a reason of a different type saved
  // into this slot — is shown as unset, so the field reads as "not linked to a
  // reason" rather than exposing a raw, unusable id.
  const linkedValue = (selectedId: string, options: { id: string }[]) =>
    options.some(o => o.id === selectedId) ? selectedId : '';

  return (
    <Stack spacing={2}>
      <Typography variant="h6">{t('config.wastage.heading')}</Typography>
      <Typography variant="caption" color="text.secondary">
        {t('config.wastage.help')}
      </Typography>
      <Select
        label={t('config.wastage.open-vial')}
        value={linkedValue(value.open_vial, openVialOptions)}
        onChange={e =>
          onChange({ ...value, open_vial: e.target.value as string })
        }
        options={buildSelectOptions(openVialOptions)}
        disabled={isOpenVialLoading}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <Select
        label={t('config.wastage.negative-adjustment')}
        value={linkedValue(value.negative_adjustment, negativeOptions)}
        onChange={e =>
          onChange({
            ...value,
            negative_adjustment: e.target.value as string,
          })
        }
        options={buildSelectOptions(negativeOptions)}
        disabled={isNegativeLoading}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
};
