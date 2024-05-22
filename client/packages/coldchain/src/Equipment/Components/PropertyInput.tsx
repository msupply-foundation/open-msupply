import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Checkbox,
  NumericTextInput,
} from '@common/components';
import { PropertyNodeValueType } from '@common/types';

type PropertyValue = string | number | boolean | undefined;
type PropertyInput = {
  valueType: PropertyNodeValueType;
  allowedValues?: string[];
  value: PropertyValue | null;
  onChange: (value: PropertyValue) => void;
};

const mapValueToOption = (value: PropertyValue | null) =>
  value === null
    ? undefined
    : {
        label: value as string,
        id: value as string,
        value,
      };

export const PropertyInput: FC<PropertyInput> = ({
  valueType,
  allowedValues,
  value,
  onChange,
}) => {
  switch (valueType) {
    case PropertyNodeValueType.Boolean:
      return (
        <Checkbox
          checked={value as boolean}
          onChange={e => onChange(e.target.checked)}
        />
      );
    case PropertyNodeValueType.Integer:
    case PropertyNodeValueType.Float:
      const valueInt = value as number;
      return (
        <NumericTextInput
          value={valueInt ?? 0}
          fullWidth
          allowNegative
          onChange={n => {
            onChange(n);
          }}
          decimalLimit={valueType === PropertyNodeValueType.Float ? 5 : 0}
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
        />
      );
  }

  return <div>{value}</div>;
};
