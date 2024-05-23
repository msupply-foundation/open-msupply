import {
  Autocomplete,
  BasicTextInput,
  Checkbox,
  NumericTextInput,
} from '@common/components';
import { PropertyNodeValueType } from '@common/types';
import React, { FC } from 'react';

export type PropertyInput = {
  valueType: PropertyNodeValueType;
  allowedValues?: string[];
  value: string | number | boolean | undefined | null;
  onChange: (value: string | number | boolean | undefined) => void;
  isCatalogue?: boolean;
};

export const PropertyInput: FC<PropertyInput> = ({
  valueType,
  allowedValues,
  value,
  onChange,
  isCatalogue,
}) => {
  switch (valueType) {
    case PropertyNodeValueType.Boolean:
      return (
        <Checkbox
          checked={value as boolean}
          onChange={e => onChange(e.target.checked)}
          disabled={isCatalogue}
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
          disabled={isCatalogue}
        />
      );
    case PropertyNodeValueType.String:
      if (allowedValues && allowedValues.length > 0) {
        const valueOption = {
          label: value as string,
          id: value as string,
          value: value as string,
        };
        return (
          <Autocomplete
            options={allowedValues.map(value => ({
              label: value,
              id: value,
              value,
            }))}
            value={valueOption}
            onChange={(_, value) => {
              onChange(value?.value);
            }}
            disabled={isCatalogue}
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
          disabled={isCatalogue}
        />
      );
  }

  return <div>{value}</div>;
};
