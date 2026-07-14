import React from 'react';
import {
  AppBarContentPortal,
  FilterMenu,
  Box,
  useTranslation,
  RequisitionNodeStatus,
  FilterDefinition,
  useAuthContext,
} from '@openmsupply-client/common';

const ToolbarComponent = () => {
  const t = useTranslation();
  const { store } = useAuthContext();

  const filters: FilterDefinition[] = [
    {
      type: 'text',
      name: t('label.name'),
      urlParameter: 'otherPartyName',
      placeholder: t('placeholder.search-by-name'),
    },
    {
      type: 'number',
      name: t('label.requisition-number'),
      urlParameter: 'requisitionNumber',
      wide: true,
    },
    {
      type: 'enum',
      name: t('label.status'),
      urlParameter: 'status',
      options: [
        { label: t('label.new'), value: RequisitionNodeStatus.New },
        {
          label: t('label.finalised'),
          value: RequisitionNodeStatus.Finalised,
        },
      ],
    },
    {
      type: 'boolean',
      name: t('label.shipment-created'),
      urlParameter: 'aShipmentHasBeenCreated',
    },
  ];

  if (store?.preferences.omProgramModule) {
    filters.push({
      type: 'boolean',
      name: t('label.emergency'),
      urlParameter: 'isEmergency',
    });
  }

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
        <FilterMenu filters={filters} />
      </Box>
    </AppBarContentPortal>
  );
};

export const Toolbar = React.memo(ToolbarComponent);
