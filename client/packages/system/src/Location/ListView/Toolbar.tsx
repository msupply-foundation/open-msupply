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
              name: t('label.name'),
              urlParameter: 'name',
            },
            {
              type: 'text',
              name: t('label.code'),
              urlParameter: 'code',
            },
            {
              type: 'boolean',
              name: t('label.on-hold'),
              urlParameter: 'onHold',
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
