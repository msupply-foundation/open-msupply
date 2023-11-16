import React, { FC } from 'react';
import { RangeObject, useUrlQuery } from '@common/hooks';
import { DatePickerInput, DateTimePickerInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { DateUtils, useFormatDateTime } from '@common/intl';

export interface DateFilterDefinition extends FilterDefinitionCommon {
  type: 'date' | 'dateTime';
  range?: RangeOption;
  maxDate?: Date | string;
  minDate?: Date | string;
}

export type RangeOption = 'from' | 'to';

export const DateFilter: FC<{ filterDefinition: DateFilterDefinition }> = ({
  filterDefinition,
}) => {
  const {
    type,
    urlParameter,
    name,
    range,
    maxDate = '9999-12-31',
    minDate = '0000-01-01',
  } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery();
  const { customDate, urlQueryDate, urlQueryDateTime } = useFormatDateTime();

  const urlValue = urlQuery[urlParameter] as string;
  const value = getDateFromUrl(urlValue, range);

  const dateTimeFormat = type === 'dateTime' ? urlQueryDateTime : urlQueryDate;

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
    minDate: getRangeBoundary(urlValue, range, minDate),
    maxDate: getRangeBoundary(urlValue, range, maxDate),
  };

  return type === 'dateTime' ? (
    <DateTimePickerInput {...componentProps} />
  ) : (
    <DatePickerInput {...componentProps} />
  );
};

const getDateFromUrl = (query: string, range: RangeOption | undefined) => {
  const value = typeof query !== 'object' || !range ? query : query[range];
  return DateUtils.getDateOrNull(value);
};

const getRangeBoundary = (
  query: string | RangeObject<string>,
  range: RangeOption | undefined,
  limit: Date | string | undefined
) => {
  const limitDate = DateUtils.getDateOrNull(limit);
  if (typeof query !== 'object' || !range) return limitDate || undefined;
  const { from, to } = query as RangeObject<string>;

  if (range === 'from')
    return to
      ? DateUtils.minDate(DateUtils.getDateOrNull(to), limitDate) ?? undefined
      : limitDate ?? undefined;
  else
    return from
      ? DateUtils.maxDate(DateUtils.getDateOrNull(from), limitDate) ?? undefined
      : limitDate ?? undefined;
};
