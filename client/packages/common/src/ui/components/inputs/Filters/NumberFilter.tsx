import React, { FC, useState } from 'react';
import {
  RangeObject,
  useUrlQuery,
  useDebouncedValueCallback,
  UrlQueryValue,
} from '@common/hooks';
import { NumericTextInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { RangeOption } from './DateFilter';
import { FilterLabelSx } from './styleConstants';

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
  const {
    urlParameter,
    name,
    range,
    minValue = -Infinity,
    maxValue = Infinity,
    decimalLimit,
  } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery();
  const urlValue = urlQuery[urlParameter] as number;
  const [value, setValue] = useState(
    getNumberFromUrl(urlValue, range) as number | undefined
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
      sx={FilterLabelSx}
      onChange={handleChange}
      value={value}
      min={getRangeBoundary(urlValue, range, minValue)}
      max={getRangeBoundary(urlValue, range, maxValue)}
      decimalLimit={decimalLimit}
    />
  );
};

const getNumberFromUrl = (
  query: UrlQueryValue,
  range: RangeOption | undefined
) => {
  if (typeof query !== 'object' || !range) return query;
  return query[range];
};

const getRangeBoundary = (
  query: number | RangeObject<number>,
  range: RangeOption | undefined,
  limit: number
) => {
  if (typeof query !== 'object' || !range) return limit;
  const { from, to } = query;

  if (range === 'from') return to ? Math.min(to, limit) : limit;
  else return from ? Math.max(from, limit) : limit;
};
