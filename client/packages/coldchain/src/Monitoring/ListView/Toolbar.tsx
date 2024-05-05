import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
  TemperatureBreachNodeType,
  DateUtils,
} from '@openmsupply-client/common';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation('coldchain');

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
                  name: t('label.from-datetime'),
                  urlParameter: 'datetime',
                  range: 'from',
                  maxDate: DateUtils.addMinutes(new Date(), -30),
                  isDefault: true,
                },
                {
                  type: 'dateTime',
                  name: t('label.to-datetime'),
                  urlParameter: 'datetime',
                  range: 'to',
                  maxDate: new Date(),
                  isDefault: true,
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.breach-type'),
              urlParameter: 'temperatureBreach.type',
              options: [
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
              ],
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
