import React, { FC } from 'react';
import { RangeObject, useUrlQuery } from '@common/hooks';
import { DateTimePickerInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { DateUtils, useFormatDateTime } from '@common/intl';
import { FilterLabelSx } from './styleConstants';
import { PickersActionBarAction } from '@mui/x-date-pickers';

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
    maxDate,
    minDate,
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
    actions: ['clear', 'accept'] as PickersActionBarAction[],
    displayAs,
    ...getMinMaxDates(urlValue, range, minDate, maxDate),
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

export const getMinMaxDates = (
  query: string | RangeObject<string>,
  range: RangeOption | undefined,
  min: Date | string | undefined,
  max: Date | string | undefined
) => {
  const minDate = DateUtils.getDateOrNull(min);
  const maxDate = DateUtils.getDateOrNull(max);

  if (typeof query !== 'object' || !range) {
    return {
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
    };
  }

  const { from, to } = query as RangeObject<string>;

  if (range === 'from') {
    const toDate = DateUtils.getDateOrNull(to);
    return {
      minDate: minDate || undefined,
      maxDate: DateUtils.minDate(toDate, maxDate) ?? undefined,
    };
  } else {
    const fromDate = DateUtils.getDateOrNull(from);

    return {
      minDate:
        // Only use maxDate if both defined (otherwise the undefined date is considered the max)
        fromDate && minDate
          ? (DateUtils.maxDate(fromDate, minDate) ?? undefined)
          : (fromDate ?? minDate ?? undefined),
      maxDate: maxDate || undefined,
    };
  }
};
