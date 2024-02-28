import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterMenu,
  useTranslation,
} from '@openmsupply-client/common';

export const Toolbar = () => {
  const t = useTranslation('catalogue');

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
              type: 'enum',
              name: t('label.category'),
              urlParameter: 'category',
              options: [
                {
                  label: 'Insulated Containers',
                  value: 'aaa-bbb-ccc',
                },
                {
                  label: 'Refrigerators and freezers',
                  value: 'aaa-bbb-ccc',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.class'),
              urlParameter: 'class',
              options: [
                {
                  label: 'Cold Chain Equipment',
                  value: 'aaa-bbb-ccc',
                },
              ],
            },
            {
              type: 'text',
              name: t('label.code'),
              urlParameter: 'code',
            },
            {
              type: 'text',
              name: t('label.name'),
              urlParameter: 'name',
              placeholder: t('placeholder.search-by-name'),
            },
            {
              type: 'enum',
              name: t('label.type'),
              urlParameter: 'type',
              options: [
                {
                  label: 'Icelined refrigerator',
                  value: 'aaa-bbb-ccc',
                },
                {
                  label: 'Solar direct drive refrigerator/freezer',
                  value: 'aaa-bbb-ccc',
                },
                {
                  label: 'Vaccine/Waterpacks freezer',
                  value: 'aaa-bbb-ccc',
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
