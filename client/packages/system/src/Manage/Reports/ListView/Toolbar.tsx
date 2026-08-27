import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterMenu,
  useTranslation,
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
              placeholder: t('placeholder.search-by-name'),
            },
            {
              type: 'text',
              name: t('label.code'),
              urlParameter: 'code',
              placeholder: t('placeholder.search-by-code'),
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
