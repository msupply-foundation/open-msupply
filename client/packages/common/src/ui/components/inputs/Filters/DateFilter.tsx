import React, { FC } from 'react';
import { RangeObject, useUrlQuery } from '@common/hooks';
import { DateTimePickerInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { DateUtils, useFormatDateTime } from '@common/intl';
import { FilterLabelSx } from './styleConstants';

export interface DateFilterDefinition extends FilterDefinitionCommon {
  type: 'date' | 'dateTime';
  displayAs?: 'date' | 'dateTime';
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
    displayAs = type,
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

      const date =
        range === 'to' && displayAs === 'date' // if no time picker, set "TO" field to end of day
          ? DateUtils.endOfDay(selection)
          : selection;

      updateQuery({
        [urlParameter]: { [range]: customDate(date, dateTimeFormat) },
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
      sx: FilterLabelSx,
    },
    minDate: getRangeBoundary(urlValue, range, minDate),
    maxDate: getRangeBoundary(urlValue, range, maxDate),
  };

  return displayAs === 'dateTime' ? (
    <DateTimePickerInput showTime={true} {...componentProps} />
  ) : (
    <DateTimePickerInput {...componentProps} />
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
  const limitDate = DateUtils.getNaiveDate(limit);
  if (typeof query !== 'object' || !range) return limitDate || undefined;
  const { from, to } = query as RangeObject<string>;

  if (range === 'from')
    return to
      ? (DateUtils.minDate(DateUtils.getNaiveDate(to), limitDate) ?? undefined)
      : (limitDate ?? undefined);
  else
    return from
      ? (DateUtils.maxDate(DateUtils.getNaiveDate(from), limitDate) ??
          undefined)
      : (limitDate ?? undefined);
};
