import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterMenu,
  StockRelocationNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import { getStatusTranslation } from '../utils';

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
              name: t('label.code-or-name'),
              urlParameter: 'itemCodeOrName',
              placeholder: t('placeholder.enter-an-item-code-or-name'),
              isDefault: true,
            },
            {
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: Object.values(StockRelocationNodeStatus).map(status => ({
                label: getStatusTranslation(status, t),
                value: status,
              })),
            },
            {
              type: 'text',
              name: t('label.from-location'),
              urlParameter: 'fromLocationCode',
              placeholder: t('placeholder.search-by-location-code'),
            },
            {
              type: 'text',
              name: t('label.to-location'),
              urlParameter: 'toLocationCode',
              placeholder: t('placeholder.search-by-location-code'),
            }
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
