import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  Box,
  FilterMenu,
  usePreferences,
  FilterDefinition,
  GroupFilterDefinition,
  useAuthContext,
} from '@openmsupply-client/common';
import { useVvmStatusesEnabled } from '../api';
import { useMasterLists } from '../../MasterList';
import { useCampaigns } from '../../Manage/Campaigns/api';

export const Toolbar = ({ isGrouped }: { isGrouped: boolean }) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const { manageVvmStatusForStock } = usePreferences();
  const { data: vmmStatuses } = useVvmStatusesEnabled();
  const { data: masterLists } = useMasterLists({
    queryParams: {
      filterBy: { existsForStoreId: { equalTo: store?.id } },
      first: 1000,
    },
  });
  const {
    query: { data: campaigns },
  } = useCampaigns({
    sortBy: { key: 'name', direction: 'asc', isDesc: false },
    first: 1000,
  });

  // Item-level filters apply in both grouped and ungrouped modes.
  const itemFilters = [
    {
      type: 'text',
      name: t('messages.search'),
      urlParameter: 'search',
      placeholder: t('messages.search'),
      isDefault: true,
    },
    ...(masterLists?.nodes?.length
      ? [
        {
          type: 'enum',
          name: t('label.master-list'),
          urlParameter: 'masterList.id',
          options: masterLists.nodes.map(ml => ({
            label: ml.name,
            value: ml.id,
          })),
        } as FilterDefinition,
      ]
      : []),
    ...(campaigns?.nodes?.length
      ? [
        {
          type: 'enum',
          name: t('label.campaign-only'),
          urlParameter: 'campaignId',
          options: campaigns.nodes.map(c => ({
            label: c.name,
            value: c.id,
          })),
        } as FilterDefinition,
      ]
      : []),
  ] satisfies FilterDefinition[];

  const stockLineFilters = [
    {
      type: 'text',
      name: t('label.location'),
      urlParameter: 'location.codeOrName',
      placeholder: t('placeholder.search-by-location-code-or-name'),
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
  ] satisfies (FilterDefinition | GroupFilterDefinition)[];

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
          filters={
            isGrouped ? itemFilters : [...itemFilters, ...stockLineFilters]
          }
        />
      </Box>
    </AppBarContentPortal>
  );
};
