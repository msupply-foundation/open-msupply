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
              name: t('label.last-name'),
              urlParameter: 'patient.lastName',
              placeholder: t('placeholder.search-by-last-name'),
            },
            {
              type: 'text',
              name: t('label.program'),
              urlParameter: 'programEnrolment.programName',
            },
            {
              type: 'group',
              name: t('label.start-datetime'),
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
              name: t('label.status'),
              urlParameter: 'status',
              options: [
                { label: 'Pending', value: 'PENDING' },
                { label: 'Visited', value: 'VISITED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
