import React from 'react';
import {
  AppBarContentPortal,
  FilterMenu,
  Box,
  // useTranslation,
} from '@openmsupply-client/common';

// Placeholder for filters
const filters: any[] = [];

export const Toolbar: React.FC = () => {
  // const t = useTranslation();
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
        <FilterMenu filters={filters} />
      </Box>
    </AppBarContentPortal>
  );
};
