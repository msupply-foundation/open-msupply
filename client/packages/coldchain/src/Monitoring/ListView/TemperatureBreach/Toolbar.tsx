import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
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
              urlParameter: 'location.name',
            },
            // {
            //   type: 'text',
            //   name: t('label.cce'),
            //   urlParameter: 'cce',
            // },
            {
              type: 'group',
              name: 'Date/Time Range',
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-start-datetime'),
                  urlParameter: 'startDatetime',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  name: t('label.to-start-datetime'),
                  urlParameter: 'startDatetime',
                  range: 'to',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.type'),
              urlParameter: 'type',
              options: [
                { label: t('label.cold-cumulative'), value: 'COLD_CUMULATIVE' },
                {
                  label: t('label.cold-consecutive'),
                  value: 'COLD_CONSECUTIVE',
                },
                { label: t('label.hot-cumulative'), value: 'HOT_CUMULATIVE' },
                { label: t('label.hot-consecutive'), value: 'HOT_CONSECUTIVE' },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
