import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
  TemperatureBreachNodeType,
  TypedTFunction,
  LocaleKey,
} from '@openmsupply-client/common';

export const breachTypeOptions = (t: TypedTFunction<LocaleKey>) => [
  {
    label: t('label.cold-cumulative'),
    value: TemperatureBreachNodeType.ColdCumulative,
  },
  {
    label: t('label.cold-consecutive'),
    value: TemperatureBreachNodeType.ColdConsecutive,
  },
  {
    label: t('label.hot-cumulative'),
    value: TemperatureBreachNodeType.HotCumulative,
  },
  {
    label: t('label.hot-consecutive'),
    value: TemperatureBreachNodeType.HotConsecutive,
  },
];

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation();

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
            {
              type: 'text',
              name: t('label.sensor-name'),
              urlParameter: 'sensor.name',
            },
            {
              type: 'text',
              name: t('label.location'),
              urlParameter: 'location.code',
              placeholder: t('placeholder.search-by-location-code'),
            },
            {
              type: 'group',
              name: 'Date/Time Range',
              elements: [
                {
                  type: 'dateTime',
                  showTimepicker: true,
                  name: t('label.from-start-datetime'),
                  urlParameter: 'datetime',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  showTimepicker: true,
                  name: t('label.to-start-datetime'),
                  urlParameter: 'datetime',
                  range: 'to',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.breach-type'),
              urlParameter: 'type',
              options: breachTypeOptions(t),
            },
            {
              type: 'boolean',
              name: t('label.unacknowledged'),
              urlParameter: 'unacknowledged',
              isDefault: true,
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
