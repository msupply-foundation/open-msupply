import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
  InvoiceNodeStatus,
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
              type: 'enum',
              name: t('label.status'),
              options: [
                { label: t('status.new'), value: InvoiceNodeStatus.New },
                { label: t('label.picked'), value: InvoiceNodeStatus.Picked },
                {
                  label: t('label.verified'),
                  value: InvoiceNodeStatus.Verified,
                },
                {
                  label: t('label.cancelled'),
                  value: InvoiceNodeStatus.Cancelled,
                },
              ],
              urlParameter: 'status',
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
                  type: 'date',
                  name: t('label.from-date'),
                  urlParameter: 'createdOrBackdatedDatetime',
                  range: 'from',
                  isDefault: true,
                },
                {
                  type: 'date',
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
