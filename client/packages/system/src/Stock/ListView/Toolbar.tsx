import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterController,
  Box,
  FilterMenu,
} from '@openmsupply-client/common';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation('inventory');

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
              name: t('label.code-or-name'),
              urlParameter: 'itemCodeOrName',
              placeholder: t('placeholder.enter-an-item-code-or-name'),
            },
            {
              type: 'text',
              name: t('label.location'),
              urlParameter: 'location.code',
              placeholder: t('placeholder.search-by-location-code'),
            },
            {
              type: 'group',
              name: t('label.expiry'),
              elements: [
                {
                  type: 'date',
                  name: t('label.from-expiry'),
                  urlParameter: 'expiryDate',
                  range: 'from',
                },
                {
                  type: 'date',
                  name: t('label.to-expiry'),
                  urlParameter: 'expiryDate',
                  range: 'to',
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
