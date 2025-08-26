import {
  SyncMessageNodeStatus,
  SyncMessageNodeType,
  useTranslation,
  AppBarContentPortal,
  FilterMenu,
  Box,
} from '@openmsupply-client/common';
import React from 'react';

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
              options: [
                { label: t('label.other'), value: SyncMessageNodeType.Other },
                {
                  label: t('label.request-field-change'),
                  value: SyncMessageNodeType.RequestFieldChange,
                },
              ],
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
                  isDefault: false,
                },
                {
                  type: 'date',
                  name: t('label.to-date'),
                  urlParameter: 'createdDatetime',
                  range: 'to',
                  isDefault: false,
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.status'),
              options: [
                { label: t('label.new'), value: SyncMessageNodeStatus.New },
                {
                  label: t('label.processed'),
                  value: SyncMessageNodeStatus.Processed,
                },
              ],
              urlParameter: 'status',
              isDefault: true,
            },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
