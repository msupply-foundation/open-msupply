import React, { FC } from 'react';
import {
  Autocomplete,
  BasicTextInput,
  Checkbox,
  DateTimePickerInput,
  NumericTextInput,
} from '@common/components';
import { PropertyNodeValueType } from '@common/types';
import { DateUtils } from '@common/intl';
import { Formatter } from '@common/utils';
import { SxProps, Theme } from '@common/styles';

type PropertyValue = string | number | boolean | undefined;
type PropertyInput = {
  valueType: PropertyNodeValueType;
  allowedValues?: string[];
  value: PropertyValue | null;
  onChange: (value: PropertyValue) => void;
  disabled?: boolean;
  textSx?: SxProps<Theme>;
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
  disabled,
  textSx,
}) => {
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
          slotProps={{ htmlInput: { sx: textSx } }}
        />
      );
    case PropertyNodeValueType.Date:
      return (
        <DateTimePickerInput
          // value is always string | null for Date properties, but PropertyValue is wider
          value={DateUtils.getDateOrNull(value as string)}
          format="P"
          onChange={date =>
            onChange(date ? Formatter.naiveDate(date) ?? undefined : undefined)
          }
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
