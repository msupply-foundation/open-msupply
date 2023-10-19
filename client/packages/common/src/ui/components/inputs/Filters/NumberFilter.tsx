import React, { FC, useState } from 'react';
import {
  RangeObject,
  useUrlQuery,
  useDebouncedValueCallback,
  RANGE_SPLIT_CHAR,
} from '@common/hooks';
import { NumericTextInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { RangeOption } from './DateFilter';

export interface NumberFilterDefinition extends FilterDefinitionCommon {
  type: 'number';
  range?: RangeOption;
  minValue?: number;
  maxValue?: number;
  decimalLimit?: number;
}

export const NumberFilter: FC<{ filterDefinition: NumberFilterDefinition }> = ({
  filterDefinition,
}) => {
  const { urlParameter, name, range, minValue, maxValue, decimalLimit } =
    filterDefinition;
  const { urlQuery, updateQuery, parseRangeString } = useUrlQuery();
  const [value, setValue] = useState(
    getNumberFromUrl(
      urlQuery[urlParameter] as string | number,
      range,
      parseRangeString
    )
  );

  const debouncedOnChange = useDebouncedValueCallback(
    val => {
      if (range) {
        // Handle value that is part of a range
        if (val === undefined) updateQuery({ [urlParameter]: { [range]: '' } });
        else updateQuery({ [urlParameter]: { [range]: val } });
      } else {
        // Handle standalone value
        if (val === undefined) updateQuery({ [urlParameter]: '' });
        else updateQuery({ [urlParameter]: val });
      }
    },
    [],
    400
  );

  const handleChange = (newValue: number | undefined) => {
    setValue(newValue);
    debouncedOnChange(newValue);
  };

  return (
    <NumericTextInput
      label={name}
      width={FILTER_WIDTH / 2}
      sx={{
        '& .MuiInputLabel-root': {
          zIndex: 100,
          top: '4px',
          left: '8px',
          color: 'gray.main',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'secondary.main',
        },
      }}
      onChange={handleChange}
      value={value}
      max={maxValue}
      min={minValue}
      decimalPrecision={decimalLimit}
    />
  );
};

const getNumberFromUrl = (
  urlValue: string | number | undefined,
  range: RangeOption | undefined,
  parseRangeString: (val: string | undefined) => RangeObject
) => {
  // Matches range strings for numbers, with "_" as the splitting character.
  // Both the start date and end date are optional.
  // A "number" can contain a negative (-) prefix, and a single decimal point
  // within it (which must be followed by additional digits)
  const numberRangeRegex = new RegExp(
    `^(-?\\d+(\\.\\d+)?)?${RANGE_SPLIT_CHAR}(-?\\d+(\\.\\d+)?)?$`
  );
  if (!urlValue) return null;
  if (typeof urlValue === 'number') return urlValue;
  if (urlValue?.match(numberRangeRegex)) {
    const rangeData = parseRangeString(urlValue);
    return rangeData[range as RangeOption];
  }
  return Number(urlValue);
};
