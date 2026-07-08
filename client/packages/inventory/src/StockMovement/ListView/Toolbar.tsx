import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterMenu,
  StockRelocationNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import { getStatusTranslation } from '../utils';

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
              type: 'number',
              name: t('label.number'),
              urlParameter: 'stockMovementNumber',
              isDefault: true,
              wide: true,
            },
            {
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: Object.values(StockRelocationNodeStatus).map(status => ({
                label: getStatusTranslation(status, t),
                value: status,
              })),
            },
            {
              type: 'text',
              name: t('label.created-by'),
              urlParameter: 'username',
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
                },
                {
                  type: 'dateTime',
                  name: t('label.to-date'),
                  urlParameter: 'createdDatetime',
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
