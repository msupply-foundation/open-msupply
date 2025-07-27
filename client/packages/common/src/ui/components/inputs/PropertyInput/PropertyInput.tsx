import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Checkbox,
  NumericTextInput,
} from '@common/components';
import { PropertyNodeValueType } from '@common/types';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';

type PropertyValue = string | number | boolean | undefined;
type PropertyInput = {
  valueType: PropertyNodeValueType;
  allowedValues?: string[];
  value: PropertyValue | null;
  onChange: (value: PropertyValue) => void;
  disabled?: boolean;
};

export const PropertyInput: FC<PropertyInput> = ({
  valueType,
  allowedValues,
  value,
  onChange,
  disabled,
}) => {
  const t = useTranslation();

  const mapValueToOption = (value: PropertyValue | null) =>
    value === null
      ? undefined
      : {
          label: translateValueLabels(t, value as string),
          id: value as string,
          value,
        };

  switch (valueType) {
    case PropertyNodeValueType.Boolean:
      return (
        <Checkbox
          checked={value as boolean}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
      );
    case PropertyNodeValueType.Integer:
    case PropertyNodeValueType.Float:
      const valueInt = value as number;
      return (
        <NumericTextInput
          value={valueInt ?? 0}
          fullWidth
          allowNegative={allowedValues?.some(
            value => value.toLowerCase() === 'negative'
          )}
          onChange={n => {
            onChange(n);
          }}
          decimalLimit={valueType === PropertyNodeValueType.Float ? 5 : 0}
          disabled={disabled}
        />
      );
    case PropertyNodeValueType.String:
      if (allowedValues && allowedValues.length > 0) {
        return (
          <Autocomplete
            options={allowedValues.map(mapValueToOption)}
            value={mapValueToOption(value)}
            onChange={(_, value) => {
              onChange(value?.value);
            }}
            disabled={disabled}
          />
        );
      }
      return (
        <BasicTextInput
          value={value}
          fullWidth
          onChange={e => {
            onChange(e.target.value);
          }}
          disabled={disabled}
        />
      );
  }

  return <div>{value}</div>;
};

const translateValueLabels = (t: TypedTFunction<LocaleKey>, value: string) => {
  switch (value) {
    case 'Primary (1)':
      return t('label.primary-1');
    case 'Secondary (2)':
      return t('label.secondary-2');
    case 'Tertiary (3)':
      return t('label.tertiary-3');
  }
};
