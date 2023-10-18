import React, { FC } from 'react';
import { RangeObject, useUrlQuery, RANGE_SPLIT_CHAR } from '@common/hooks';
import { NumericTextInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';

export interface NumberFilterDefinition extends FilterDefinitionCommon {
  type: 'number';
  range?: RangeOption;
  minValue?: number;
  maxValue?: number;
  allowDecimal?: boolean;
}

type RangeOption = 'from' | 'to';

// Matches range strings for numbers, with "_" as the splitting character. Both
// the start date and end date are optional.
// A "number" can contain a negative (-) prefix, and a single decimal point
// within it (which must be followed by additional digits)
const numberRangeRegex = new RegExp(
  `^-?\\d+(\\.\\d+)?${RANGE_SPLIT_CHAR}-?\\d+(\\.\\d+)?$`
);

export const NumberFilter: FC<{ filterDefinition: NumberFilterDefinition }> = ({
  filterDefinition,
}) => {
  const { urlParameter, name, range, minValue, maxValue, allowDecimal } =
    filterDefinition;
  const { urlQuery, updateQuery, parseRangeString } = useUrlQuery();

  const value = getNumberFromUrl(
    urlQuery[urlParameter] as any,
    range,
    parseRangeString
  );

  console.log('Value', value);
  const handleChange = (num: number | undefined) => {
    console.log('Num', num);
    if (range) {
      if (num === undefined) {
        updateQuery({ [urlParameter]: { [range]: '' } });
        return;
      }
      console.log({
        [urlParameter]: { [range]: num },
      });
      updateQuery({
        [urlParameter]: { [range]: num },
      });
    } else {
      if (!num) {
        updateQuery({ [urlParameter]: '' });
        return;
      }
      updateQuery({ [urlParameter]: num });
    }
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
      // placeholder="Do placeholders work?"
    />
  );
};

console.log('numberRangeRegex', numberRangeRegex);

const getNumberFromUrl = (
  urlValue: string | number | undefined,
  range: RangeOption | undefined,
  parseRangeString: (val: string | undefined) => RangeObject
) => {
  console.log('urlValue', urlValue);
  if (!urlValue) return null;
  if (typeof urlValue === 'number') return urlValue;
  if (urlValue?.match(numberRangeRegex)) {
    console.log('MATCH');
    const rangeData = parseRangeString(urlValue);
    console.log('rangeData', rangeData);
    return rangeData[range as RangeOption];
  }
  console.log('NO MATCH');
  return Number(urlValue);
};
