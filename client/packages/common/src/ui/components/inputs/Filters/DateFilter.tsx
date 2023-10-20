import React, { FC } from 'react';
import { RangeObject, useUrlQuery, RANGE_SPLIT_CHAR } from '@common/hooks';
import { DatePickerInput, DateTimePickerInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { DateUtils, useFormatDateTime } from '@common/intl';

export interface DateFilterDefinition extends FilterDefinitionCommon {
  type: 'date' | 'dateTime';
  range?: RangeOption;
}

export type RangeOption = 'from' | 'to';

export const DateFilter: FC<{ filterDefinition: DateFilterDefinition }> = ({
  filterDefinition,
}) => {
  const { type, urlParameter, name, range } = filterDefinition;
  const { urlQuery, updateQuery, parseRangeString } = useUrlQuery();
  const { customDate } = useFormatDateTime();

  const value = getDateFromUrl(
    urlQuery[urlParameter] as string,
    range,
    parseRangeString
  );

  const dateTimeFormat =
    type === 'dateTime' ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd';

  const handleChange = (selection: Date | null) => {
    if (range) {
      if (!selection) {
        updateQuery({ [urlParameter]: { [range]: '' } });
        return;
      }
      updateQuery({
        [urlParameter]: { [range]: customDate(selection, dateTimeFormat) },
      });
    } else {
      if (!selection) {
        updateQuery({ [urlParameter]: '' });
        return;
      }
      updateQuery({ [urlParameter]: customDate(selection, dateTimeFormat) });
    }
  };

  const componentProps = {
    label: name,
    value,
    width: FILTER_WIDTH,
    onChange: handleChange,
    textFieldProps: {
      sx: {
        '& .MuiInputLabel-root': {
          zIndex: 100,
          top: '4px',
          left: '8px',
          color: 'gray.main',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'secondary.main',
        },
      },
    },
  };

  return type === 'dateTime' ? (
    <DateTimePickerInput {...componentProps} />
  ) : (
    <DatePickerInput {...componentProps} />
  );
};

const getDateFromUrl = (
  urlString: string | undefined,
  range: RangeOption | undefined,
  parseRangeString: (val: string | undefined) => RangeObject<string | number>
) => {
  // Matches range strings for either just dates or date/times, with "_" as the
  // splitting character. Both the start date and end date are optional, but
  // must be the same (date / dateTime) if both present
  //
  // E.g the following will all match
  // 2023-10-02 03:10_2023-10-03 02:10
  // 2023-10-02_2023-10-03
  // 2023-10-02 03:10_
  // _2023-10-03
  const dateRangeRegex = new RegExp(
    `^(\\d{4}-\\d{2}-\\d{2})?_(\\d{4}-\\d{2}-\\d{2})?|(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2})?${RANGE_SPLIT_CHAR}(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2})?$`
  );
  if (!urlString) return null;
  if (urlString?.match(dateRangeRegex)) {
    const rangeData = parseRangeString(urlString);
    return DateUtils.getDateOrNull(rangeData[range as RangeOption] as string);
  }
  return DateUtils.getDateOrNull(urlString);
};
