import React from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  Box,
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
              type: 'text',
              name: t('label.supplier-name'),
              urlParameter: 'supplierName',
              isDefault: true,
            },
            {
              type: 'number',
              name: t('label.purchase-order-number'),
              urlParameter: 'purchaseOrderNumber',
            },
            {
              type: 'text',
              name: t('label.item-name'),
              urlParameter: 'itemName',
            },
            {
              type: 'group',
              name: t('label.expected-delivery-date'),
              elements: [
                {
                  type: 'date',
                  name: t('label.from-expected-delivery-date'),
                  urlParameter: 'expectedDeliveryDate',
                  range: 'from',
                  width: 240,
                },
                {
                  type: 'date',
                  name: t('label.to-expected-delivery-date'),
                  urlParameter: 'expectedDeliveryDate',
                  range: 'to',
                  width: 240,
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
