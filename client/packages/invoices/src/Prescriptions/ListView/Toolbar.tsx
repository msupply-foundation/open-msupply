import React from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  Box,
  usePreferences,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { getStatusSequence } from '../../statuses';
import { getStatusTranslator } from '../../utils';

export const Toolbar = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const statuses = getStatusSequence(InvoiceNodeType.Prescription).filter(
    status => invoiceStatusOptions?.includes(status)
  );

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
              type: 'enum',
              name: t('label.status'),
              options: statuses.map(status => ({
                value: status,
                label: getStatusTranslator(t)(status),
              })),
              urlParameter: 'status',
              isDefault: false,
            },
            {
              type: 'text',
              name: t('label.reference'),
              urlParameter: 'theirReference',
              isDefault: false,
            },
            {
              type: 'number',
              name: t('label.invoice-number'),
              urlParameter: 'invoiceNumber',
              isDefault: false,
            },
            {
              type: 'group',
              name: t('label.date'),
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-date'),
                  urlParameter: 'createdOrBackdatedDatetime',
                  range: 'from',
                  isDefault: true,
                },
                {
                  type: 'dateTime',
                  name: t('label.to-date'),
                  urlParameter: 'createdOrBackdatedDatetime',
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
