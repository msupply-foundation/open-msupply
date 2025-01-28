import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
  FilterDefinition,
} from '@openmsupply-client/common';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation();

  const filters: FilterDefinition[] = [
    {
      type: 'text',
      name: t('label.name'),
      urlParameter: 'otherPartyName',
      placeholder: t('placeholder.search-by-name'),
      isDefault: true,
    },
    {
      type: 'text',
      name: t('label.invoice-number'),
      urlParameter: 'invoiceNumber',
      placeholder: t('placeholder.search-by-invoice-number'),
      isDefault: true,
    },
    {
      type: 'date',
      name: t('label.date'),
      urlParameter: 'prescriptionDatetime',
      isDefault: true,
    },
  ];

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
