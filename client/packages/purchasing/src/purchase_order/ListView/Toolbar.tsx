import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  FilterController,
  Box,
  PurchaseOrderNodeStatus,
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
              name: t('label.supplier'),
              urlParameter: 'supplier',
              isDefault: true,
            },
            {
              type: 'enum',
              name: t('label.status'),
              options: [
                { label: t('label.new'), value: PurchaseOrderNodeStatus.New },
                {
                  label: t('label.authorised'),
                  value: PurchaseOrderNodeStatus.Authorised,
                },
                {
                  label: t('label.confirmed'),
                  value: PurchaseOrderNodeStatus.Confirmed,
                },
                {
                  label: t('label.finalised'),
                  value: PurchaseOrderNodeStatus.Finalised,
                },
              ],
              urlParameter: 'status',
              isDefault: false,
            },
            {
              type: 'group',
              name: t('label.date'),
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-date'),
                  urlParameter: 'createdDatetime',
                  range: 'from',
                  isDefault: false,
                },
                {
                  type: 'dateTime',
                  name: t('label.to-date'),
                  urlParameter: 'createdDatetime',
                  range: 'to',
                  isDefault: false,
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
