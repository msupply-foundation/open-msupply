import React, { ReactElement } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  Box,
  PurchaseOrderNodeStatus,
} from '@openmsupply-client/common';

export const Toolbar = (): ReactElement => {
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
                  label: t('label.ready-for-approval'),
                  value: PurchaseOrderNodeStatus.RequestApproval,
                },
                {
                  label: t('label.ready-to-send'),
                  value: PurchaseOrderNodeStatus.Confirmed,
                },
                {
                  label: t('label.sent'),
                  value: PurchaseOrderNodeStatus.Sent,
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
              name: t('label.confirmed-datetime'),
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-confirmed-datetime'),
                  urlParameter: 'confirmedDatetime',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  name: t('label.to-confirmed-datetime'),
                  urlParameter: 'confirmedDatetime',
                  range: 'to',
                },
              ],
            },
            {
              type: 'group',
              name: t('label.requested-delivery-date'),
              elements: [
                {
                  type: 'date',
                  name: t('label.from-requested-delivery-date'),
                  urlParameter: 'requestedDeliveryDate',
                  range: 'from',
                  width: 240,
                },
                {
                  type: 'date',
                  name: t('label.to-requested-delivery-date'),
                  urlParameter: 'requestedDeliveryDate',
                  range: 'to',
                  width: 240,
                },
              ],
            },
            {
              type: 'group',
              name: t('label.sent-datetime'),
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-sent-datetime'),
                  urlParameter: 'sentDatetime',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  name: t('label.to-sent-datetime'),
                  urlParameter: 'sentDatetime',
                  range: 'to',
                },
              ],
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
