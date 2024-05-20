import { BasicTextInput, NumericTextInput } from '@common/components';
import { PropertyNodeValueType } from '@common/types';
import React, { FC } from 'react';

export type PropertyInput = {
  valueType: PropertyNodeValueType;
  value: string | number | boolean | undefined | null;
  onChange: (value: string | number | boolean | undefined) => void;
};

export const PropertyInput: FC<PropertyInput> = ({
  valueType,
  value,
  onChange,
}) => {
  switch (valueType) {
    case PropertyNodeValueType.Boolean:
      return (
        <input
          type="checkbox"
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
          onChange={n => {
            onChange(n);
          }}
          decimalLimit={valueType === PropertyNodeValueType.Float ? 5 : 0}
        />
      );
    case PropertyNodeValueType.String:
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
