import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  Box,
  FilterMenu,
  usePreferences,
  FilterDefinition,
} from '@openmsupply-client/common';
import { useVvmStatusesEnabled } from '../api';

export const Toolbar = () => {
  const t = useTranslation();
  const { manageVvmStatusForStock } = usePreferences();
  const { data: vmmStatuses } = useVvmStatusesEnabled();

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
              urlParameter: 'itemCodeOrName',
              placeholder: t('placeholder.enter-an-item-code-or-name'),
              isDefault: true,
            },
            {
              type: 'text',
              name: t('label.location'),
              urlParameter: 'location.code',
              placeholder: t('placeholder.search-by-location-code'),
            },
            {
              type: 'text',
              name: t('label.master-list'),
              urlParameter: 'masterList.name',
              placeholder: t('placeholder.search-by-master-list-name'),
            },
            {
              type: 'group',
              name: t('label.expiry'),
              elements: [
                {
                  type: 'date',
                  name: t('label.from-expiry'),
                  urlParameter: 'expiryDate',
                  range: 'from',
                },
                {
                  type: 'date',
                  name: t('label.to-expiry'),
                  urlParameter: 'expiryDate',
                  range: 'to',
                },
              ],
            },
            ...(manageVvmStatusForStock
              ? [
                  {
                    type: 'enum',
                    name: t('label.vvm-status'),
                    urlParameter: 'vvmStatusId',
                    options: vmmStatuses?.map(status => ({
                      label: status.description ?? '',
                      value: status.id,
                    })),
                  } as FilterDefinition,
                ]
              : []),
          ]}
        />
      </Box>
    </AppBarContentPortal>
  );
};
