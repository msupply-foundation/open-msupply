import React, { FC } from 'react';
import { RangeObject, useUrlQuery } from '@common/hooks';
import { DatePickerInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { DateUtils, useFormatDateTime } from '@common/intl';

export interface DateFilterDefinition extends FilterDefinitionCommon {
  type: 'date';
  range?: RangeOption;
}

type RangeOption = 'from' | 'to';

export const DateFilter: FC<{
  filterDefinition: DateFilterDefinition;
  remove: () => void;
}> = ({ filterDefinition }) => {
  const { urlParameter, name, range } = filterDefinition;
  const { urlQuery, updateQuery, parseRangeString } = useUrlQuery();
  const { customDate } = useFormatDateTime();

  const value = getDateFromUrl(
    urlQuery[urlParameter] as string,
    range,
    parseRangeString
  );

  const handleChange = (selection: Date | null) => {
    if (range) {
      if (!selection) {
        updateQuery({ [urlParameter]: { [range]: '' } });
        return;
      }
      updateQuery({
        [urlParameter]: { [range]: customDate(selection, 'yyyy-MM-dd') },
      });
    } else {
      if (!selection) {
        updateQuery({ [urlParameter]: '' });
        return;
      }

      updateQuery({ [urlParameter]: customDate(selection, 'yyyy-MM-dd') });
    }
  };

  return (
    <DatePickerInput
      label={name}
      value={value}
      width={FILTER_WIDTH}
      onChange={handleChange}
      textFieldProps={{
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
      }}
    />
  );
};

const getDateFromUrl = (
  urlString: string | undefined,
  range: RangeOption | undefined,
  parseRangeString: (val: string | undefined) => RangeObject
) => {
  if (urlString) return null;
  if (urlString?.match(/^(\d{4}-\d{2}-\d{2})?_(\d{4}-\d{2}-\d{2})?$/)) {
    const rangeData = parseRangeString(urlString);
    return DateUtils.getDateOrNull(rangeData[range as RangeOption] as string);
  }
  return DateUtils.getDateOrNull(urlString);
};
