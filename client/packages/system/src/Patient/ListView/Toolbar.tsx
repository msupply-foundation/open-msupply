import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
} from '@openmsupply-client/common';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation('dispensary');

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" gap={1}>
        <FilterMenu
          filters={[
            // Can instantiate multiple related filters at once using this
            // "group" option
            {
              type: 'number',
              name: 'Numeric value',
              urlParameter: 'value',
              // placeholder: t('placeholder.search-by-identifier'),
            },
            {
              type: 'group',
              name: 'Number range',
              elements: [
                {
                  type: 'number',
                  name: 'Lower bound',
                  urlParameter: 'valueRange',
                  range: 'from',
                  // placeholder: t('placeholder.search-by-first-name'),
                },
                {
                  type: 'number',
                  name: 'Upper bound',
                  urlParameter: 'valueRange',
                  range: 'to',
                  // placeholder: t('placeholder.search-by-first-name'),
                },
              ],
            },
            {
              type: 'text',
              name: t('label.patient-id'),
              urlParameter: 'identifier',
              placeholder: t('placeholder.search-by-identifier'),
            },
            // A standalone "Date" input
            {
              type: 'date',
              name: 'Date',
              urlParameter: 'date',
            },
            // A standalone "Date/Time" input
            {
              type: 'dateTime',
              name: 'Date/Time',
              urlParameter: 'dateTime',
            },
            // Grouping two date inputs to form a "range". We define which
            // element is which end of the range using the "range" property.
            // Note they both update the same urlParameter
            {
              type: 'group',
              name: 'Date Range',
              elements: [
                {
                  type: 'date',
                  name: 'From date',
                  urlParameter: 'dateRange',
                  range: 'from',
                },
                {
                  type: 'date',
                  name: 'To date',
                  urlParameter: 'dateRange',
                  range: 'to',
                },
              ],
            },
            // Same as above but using date/time
            {
              type: 'group',
              name: 'Date/Time Range',
              elements: [
                {
                  type: 'dateTime',
                  name: 'From time',
                  urlParameter: 'dateTimeRange',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  name: 'To time',
                  urlParameter: 'dateTimeRange',
                  range: 'to',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.gender'),
              urlParameter: 'gender',
              options: [
                { label: 'Male', value: 'MALE' },
                { label: 'Female', value: 'FEMALE' },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
