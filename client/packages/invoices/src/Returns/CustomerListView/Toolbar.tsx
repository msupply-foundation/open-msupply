import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  Box,
  FilterMenu,
  usePreferences,
  InvoiceNodeType,
  buildCustomFieldFilterDefinitions,
} from '@openmsupply-client/common';
import { getStatusSequence } from '../../statuses';
import { getStatusTranslator } from '../../utils';
import { useInvoiceCustomFields } from '../../common';

export const Toolbar = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const statuses = getStatusSequence(InvoiceNodeType.CustomerReturn).filter(
    status => invoiceStatusOptions?.includes(status)
  );
  const { data: properties } = useInvoiceCustomFields(
    InvoiceNodeType.CustomerReturn
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
            ...buildCustomFieldFilterDefinitions(properties ?? [], {
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
