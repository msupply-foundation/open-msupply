import React from 'react';
import {
  AppBarContentPortal,
  Box,
  FilterMenu,
  SyncMessageNodeStatus,
  SyncMessageNodeType,
  useTranslation,
} from '@openmsupply-client/common';
import { statusMapping, typeMapping } from './utils';

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
            // TODO: Add proper filtering for fromStore and toStore
            {
              type: 'enum',
              name: t('label.type'),
              options: Object.values(SyncMessageNodeType).map(type => ({
                value: type,
                label: t(typeMapping(type)),
              })),
              urlParameter: 'type',
              isDefault: true,
            },
            {
              type: 'group',
              name: t('label.date'),
              elements: [
                {
                  type: 'date',
                  name: t('label.from-date'),
                  urlParameter: 'createdDatetime',
                  range: 'from',
                },
                {
                  type: 'date',
                  name: t('label.to-date'),
                  urlParameter: 'createdDatetime',
                  range: 'to',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.status'),
              options: Object.values(SyncMessageNodeStatus).map(status => ({
                value: status,
                label: t(statusMapping(status)),
              })),
              urlParameter: 'status',
              isDefault: true,
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
