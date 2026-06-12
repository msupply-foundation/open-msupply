import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  Box,
  FilterMenu,
  usePreferences,
  InvoiceNodeType,
  buildPropertyFilterDefinitions,
} from '@openmsupply-client/common';
import { getStatusSequence } from '../../statuses';
import { getStatusTranslator } from '../../utils';
import { useInvoicePropertiesV2 } from '../../common';

export const Toolbar = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const statuses = getStatusSequence(InvoiceNodeType.SupplierReturn).filter(
    status => invoiceStatusOptions?.includes(status)
  );
  const { data: properties } = useInvoicePropertiesV2(
    InvoiceNodeType.SupplierReturn
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
              placeholder: t('placeholder.search-by-name'),
            },
            {
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: statuses.map(status => ({
                value: status,
                label: getStatusTranslator(t)(status),
              })),
            },
            ...buildPropertyFilterDefinitions(properties ?? [], {
              min: t('label.min'),
              max: t('label.max'),
              fromDate: t('label.from-date'),
              toDate: t('label.to-date'),
            }),
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
