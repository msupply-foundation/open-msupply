import React, { ReactElement } from 'react';
import {
  AppBarContentPortal,
  FilterMenu,
  Box,
  buildPropertyFilterDefinitions,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../api';

/** Customer/supplier list filters — currently the name-scoped property
 * filters only (regular fields can join as they become filterable). */
export const Toolbar = (): ReactElement | null => {
  const t = useTranslation();
  const { data: properties } = useName.document.propertiesV2();

  const filters = buildPropertyFilterDefinitions(properties ?? [], {
    min: t('label.min'),
    max: t('label.max'),
    fromDate: t('label.from-date'),
    toDate: t('label.to-date'),
  });
  if (filters.length === 0) return null;

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
