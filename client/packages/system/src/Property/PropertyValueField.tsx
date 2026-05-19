import React from 'react';
import {
  BasicTextInput,
  DateTimePickerInput,
  DateUtils,
  Formatter,
  NumericTextInput,
  PropertyTypeEnum,
  PropertyValueGqlInput,
  Select,
  useTranslation,
} from '@openmsupply-client/common';
import { PropertyDetailFragment, PropertyValueFragment } from './api';

interface PropertyValueFieldProps {
  property: PropertyDetailFragment;
  value: PropertyValueFragment | undefined;
  onChange: (value: PropertyValueGqlInput) => void;
  onClear: () => void;
  disabled?: boolean;
}

const isBlank = (v: string | null | undefined) => v === null || v === undefined || v === '';

export const PropertyValueField = ({
  property,
  value,
  onChange,
  onClear,
  disabled,
}: PropertyValueFieldProps) => {
  const t = useTranslation();

  switch (property.type) {
    case PropertyTypeEnum.Text: {
      return (
        <BasicTextInput
          value={value?.valueText ?? ''}
          onChange={e => {
            const v = e.target.value;
            if (isBlank(v)) onClear();
            else onChange({ text: v });
          }}
          disabled={disabled}
          fullWidth
        />
      );
    }
    case PropertyTypeEnum.Number: {
      return (
        <NumericTextInput
          value={value?.valueNumber ?? undefined}
          onChange={n => {
            if (n === undefined || n === null) onClear();
            else onChange({ number: Math.trunc(n) });
          }}
          disabled={disabled}
        />
      );
    }
    case PropertyTypeEnum.Real: {
      return (
        <NumericTextInput
          value={value?.valueReal ?? undefined}
          decimalLimit={4}
          onChange={n => {
            if (n === undefined || n === null) onClear();
            else onChange({ real: n });
          }}
          disabled={disabled}
        />
      );
    }
    case PropertyTypeEnum.Date: {
      return (
        <DateTimePickerInput
          value={DateUtils.getDateOrNull(value?.valueDate ?? null)}
          onChange={(d: Date | null) => {
            if (!d) onClear();
            else {
              const iso = Formatter.naiveDate(d);
              if (iso) onChange({ date: iso });
            }
          }}
          disabled={disabled}
        />
      );
    }
    case PropertyTypeEnum.Option: {
      // Hide soft-deleted options unless the current value points to one — in
      // that case keep it selectable (tagged "removed") so the field renders
      // the historical selection without surprising the user.
      const currentId = value?.option?.id;
      const visible = property.options.filter(
        o => !o.isDeleted || o.id === currentId
      );
      const options = visible.map(o => ({
        label: o.isDeleted ? `${o.name} (${t('label.removed')})` : o.name,
        value: o.id,
      }));

      // `clearable` renders a divider + a localised "Clear selection" item
      // below the options. We pass an empty options-list-only menu (no blank
      // sentinel row) so the dropdown's first entry is the first real option.
      return (
        <Select
          value={currentId ?? ''}
          options={options}
          clearable
          onChange={e => {
            const v = e.target.value as string;
            if (!v) onClear();
            else onChange({ optionId: v });
          }}
          disabled={disabled}
          sx={{ minWidth: 200 }}
        />
      );
    }
    default:
      return null;
  }
};
