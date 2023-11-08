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
} from '@openmsupply-client/common';
import { useOutbound } from '../api';

export const Toolbar: FC<{ filter: FilterController }> = () => {
  const t = useTranslation('distribution');
  const onDelete = useOutbound.document.deleteRows();

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
              options: [
                { label: t('label.new'), value: 'NEW' },
                { label: t('label.allocated'), value: 'ALLOCATED' },
                { label: t('label.picked'), value: 'PICKED' },
                { label: t('label.shipped'), value: 'SHIPPED' },
                { label: t('label.delivered'), value: 'DELIVERED' },
                { label: t('label.verified'), value: 'VERIFIED' },
              ],
            },
          ]}
        />
      </Box>
      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
