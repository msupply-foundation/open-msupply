import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
} from '@openmsupply-client/common';

export const Toolbar: FC<{ filter: FilterController }> = () => {
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
              urlParameter: 'otherPartyName',
              isDefault: true,
            },
            {
              type: 'number',
              name: t('label.invoice-number'),
              urlParameter: 'invoiceNumber',
              isDefault: true,
            },
            {
              type: 'group',
              name: t('label.date'),
              elements: [
                {
                  type: 'date',
                  name: t('label.from-date'),
                  urlParameter: 'pickedDatetime',
                  range: 'from',
                  isDefault: true,
                },
                {
                  type: 'date',
                  name: t('label.to-date'),
                  urlParameter: 'pickedDatetime',
                  range: 'to',
                  isDefault: true,
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
