import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterMenu,
  Box,
} from '@openmsupply-client/common';

export const Toolbar: FC = () => {
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
              name: t('label.code-or-name'),
              urlParameter: 'codeOrName',
              placeholder: t('placeholder.enter-an-item-code-or-name'),
              isDefault: true,
            },
            {
              type: 'boolean',
              name: t('label.in-stock'),
              urlParameter: 'hasStockOnHand',
              isDefault: true,
            },
            // {
            //   type: 'text',
            //   name: t('label.from-store'),
            //   urlParameter: 'from-store',
            //   isDefault: true,
            // },
            // {
            //   type: 'enum',
            //   name: t('label.type'),
            //   options: [
            //     { label: t('label.other'), value: SyncMessageNodeType.Other },
            //     {
            //       label: t('label.request-field-change'),
            //       value: SyncMessageNodeType.RequestFieldChange,
            //     },
            //   ],
            //   urlParameter: 'type',
            //   isDefault: true,
            // },
            // {
            //   type: 'group',
            //   name: t('label.date'),
            //   elements: [
            //     {
            //       type: 'date',
            //       name: t('label.from-date'),
            //       urlParameter: 'createdDatetime',
            //       range: 'from',
            //       isDefault: false,
            //     },
            //     {
            //       type: 'date',
            //       name: t('label.to-date'),
            //       urlParameter: 'createdDatetime',
            //       range: 'to',
            //       isDefault: false,
            //     },
            //   ],
            // },
            // {
            //   type: 'enum',
            //   name: t('label.status'),
            //   options: [
            //     { label: t('label.new'), value: SyncMessageNodeStatus.New },
            //     {
            //       label: t('label.processed'),
            //       value: SyncMessageNodeStatus.Processed,
            //     },
            //   ],
            //   urlParameter: 'status',
            //   isDefault: true,
            // },
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
