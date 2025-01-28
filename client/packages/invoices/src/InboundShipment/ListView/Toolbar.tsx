import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  FilterController,
  Box,
  FilterMenu,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { useInbound } from '../api';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation('replenishment');
  const onDelete = useInbound.document.deleteRows();

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
              type: 'group',
              name: t('label.created-datetime'),
              elements: [
                {
                  type: 'dateTime',
                  name: t('label.from-created-datetime'),
                  urlParameter: 'createdDatetime',
                  range: 'from',
                },
                {
                  type: 'dateTime',
                  name: t('label.to-created-datetime'),
                  urlParameter: 'createdDatetime',
                  range: 'to',
                },
              ],
            },
            {
              type: 'enum',
              name: t('label.status'),
              urlParameter: 'status',
              options: [
                { label: t('label.new'), value: InvoiceNodeStatus.New },
                { label: t('label.shipped'), value: InvoiceNodeStatus.Shipped },
                {
                  label: t('label.delivered'),
                  value: InvoiceNodeStatus.Delivered,
                },
                {
                  label: t('label.verified'),
                  value: InvoiceNodeStatus.Verified,
                },
              ],
            },
          ]}
        />
      </Box>
      <DropdownMenu label={t('label.actions')}>
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
