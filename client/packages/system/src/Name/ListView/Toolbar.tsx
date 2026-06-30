import React, { ReactElement } from 'react';
import {
  AppBarContentPortal,
  FilterMenu,
  Box,
  buildCustomFieldFilterDefinitions,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../api';

/** Customer/supplier list filters — currently the custom-field filters only
 * (regular fields can join as they become filterable). `scope` is the name
 * custom-field scope ("customer" | "supplier") matching the list. */
export const Toolbar = ({
  scope,
}: {
  scope: 'customer' | 'supplier';
}): ReactElement | null => {
  const t = useTranslation();
  const { data: properties } = useName.document.customFields(scope);

  const filters = buildCustomFieldFilterDefinitions(properties ?? [], {
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
