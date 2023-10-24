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
            {
              type: 'number',
              name: 'Single Number',
              urlParameter: 'number',
            },
            {
              type: 'group',
              name: 'Date range',
              elements: [
                {
                  type: 'dateTime',
                  name: 'From Date',
                  range: 'from',
                  urlParameter: 'dateRange',
                },
                {
                  type: 'dateTime',
                  name: 'To Date',
                  range: 'to',
                  urlParameter: 'dateRange',
                },
              ],
            },
            {
              type: 'group',
              name: 'Number range',
              elements: [
                {
                  type: 'number',
                  name: 'Low',
                  range: 'from',
                  urlParameter: 'numberRange',
                },
                {
                  type: 'number',
                  name: 'High',
                  range: 'to',
                  urlParameter: 'numberRange',
                },
              ],
            },
            {
              type: 'text',
              name: t('label.first-name'),
              urlParameter: 'firstName',
              placeholder: t('placeholder.search-by-first-name'),
            },
            {
              type: 'text',
              name: t('label.last-name'),
              urlParameter: 'lastName',
              placeholder: t('placeholder.search-by-last-name'),
            },
            {
              type: 'text',
              name: t('label.patient-id'),
              urlParameter: 'identifier',
              placeholder: t('placeholder.search-by-identifier'),
            },
            // {
            //   type: 'enum',
            //   name: t('label.gender'),
            //   urlParameter: 'gender',
            //   options: [
            //     { label: 'Male', value: 'MALE' },
            //     { label: 'Female', value: 'FEMALE' },
            //   ],
            // },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
