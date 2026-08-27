import React from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  Box,
} from '@openmsupply-client/common';

export const Toolbar = () => {
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
              name: t('label.start-date'),
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-date'),
                  urlParameter: 'startDatetime',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  name: t('label.to-date'),
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
                {
                  label: t('label.encounter-status-pending'),
                  value: 'PENDING',
                },
                {
                  label: t('label.encounter-status-visited'),
                  value: 'VISITED',
                },
                {
                  label: t('label.encounter-status-cancelled'),
                  value: 'CANCELLED',
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
