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
              type: 'text',
              name: t('label.code'),
              urlParameter: 'asset.code',
            },
            {
              type: 'text',
              name: t('label.manufacturer'),
              urlParameter: 'asset.manufacturer',
              placeholder: t('placeholder.search-by-location-name'),
            },
            {
              type: 'text',
              name: t('label.model'),
              urlParameter: 'asset.model',
              placeholder: t('placeholder.search-by-location-name'),
            },
            {
              type: 'enum',
              name: t('label.class'),
              urlParameter: 'asset.class',
              options: [
                {
                  label: 'Cold Chain Equipment',
                  value: 'aaa-bbb-ccc',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.category'),
              urlParameter: 'asset.category',
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
              name: t('label.type'),
              urlParameter: 'asset.type',
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
