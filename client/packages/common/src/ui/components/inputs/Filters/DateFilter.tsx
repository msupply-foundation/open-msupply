import React from 'react';
import { RangeObject, useUrlQuery } from '@common/hooks';
import { DateTimePickerInput } from '@common/components';
import { FILTER_WIDTH, FilterDefinitionCommon } from './FilterMenu';
import { DateUtils, useFormatDateTime } from '@common/intl';
import { PickersActionBarAction } from '@mui/x-date-pickers';

export interface DateFilterDefinition extends FilterDefinitionCommon {
  /**
   * Use date where the stored date has no time (NaiveDate)
   * Use dateTime where the stored date has a time. (NaiveDateTime)
   * DateTime type will handle timezones
   */
  type: 'date' | 'dateTime';
  showTimepicker?: boolean;
  range?: RangeOption;
  maxDate?: Date | string;
  minDate?: Date | string;
  width?: number;
}

export type RangeOption = 'from' | 'to';

export const DateFilter = ({
  filterDefinition,
}: {
  filterDefinition: DateFilterDefinition;
}) => {
  const {
    type,
    urlParameter,
    name,
    width,
    range,
    maxDate,
    minDate,
    showTimepicker,
  } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery();
  const { customDate, urlQueryDate, urlQueryDateTime } = useFormatDateTime();

  const dateTimeFormat = type === 'dateTime' ? urlQueryDateTime : urlQueryDate;

  const urlValue = urlQuery[urlParameter] as string;
  const value = getDateFromUrl(urlValue, range, dateTimeFormat);

  const handleChange = (selection: Date | null) => {
    if (range) {
      if (!selection) {
        updateQuery({ [urlParameter]: { [range]: '' } });
        return;
      }

      let date = selection;

      // when user is only selecting the date, ensure the search filter is inclusive of start and end of day
      if (!showTimepicker && type === 'dateTime') {
        if (range === 'from') {
          date = DateUtils.startOfDay(selection);
        } else if (range === 'to') {
          date = DateUtils.endOfDay(selection);
        }
      }

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
    width: width ? width : FILTER_WIDTH,
    onChange: handleChange,
    actions: ['clear', 'accept'] as PickersActionBarAction[],
    type,
    ...getMinMaxDates(urlValue, range, minDate, maxDate),
  };

  return <DateTimePickerInput showTime={showTimepicker} {...componentProps} />;
};

const getDateFromUrl = (
  query: string,
  range: RangeOption | undefined,
  format: string
) => {
  const value = typeof query !== 'object' || !range ? query : query[range];
  return DateUtils.getDateOrNull(value, format);
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
