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
            {
              type: 'date',
              name: 'Date',
              urlParameter: 'dateOfBirth',
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
