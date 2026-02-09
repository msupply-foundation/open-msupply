import React from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  Box,
  StocktakeNodeStatus,
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
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: [
                { label: t('status.new'), value: StocktakeNodeStatus.New },
                {
                  label: t('status.finalised'),
                  value: StocktakeNodeStatus.Finalised,
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
